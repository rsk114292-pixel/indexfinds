import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User, UserRole } from './entities/user.entity';
import { QueryUserDto } from './dto/query-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async findAll(query: QueryUserDto) {
    const { search, role, isActive, page = 1, limit = 20 } = query;

    const where: FindOptionsWhere<User> = {};
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive;

    const qb = this.usersRepository.createQueryBuilder('user');

    if (role) qb.andWhere('user.role = :role', { role });
    if (isActive !== undefined)
      qb.andWhere('user.isActive = :isActive', { isActive });
    if (search) {
      qb.andWhere('(user.email ILIKE :search OR user.username ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    qb.select([
      'user.id',
      'user.email',
      'user.username',
      'user.avatar',
      'user.role',
      'user.isActive',
      'user.emailVerified',
      'user.lastLoginAt',
      'user.createdAt',
    ]);

    qb.orderBy('user.createdAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async create(dto: CreateUserDto, currentUser: User) {
    // 普通管理员只能创建普通用户
    if (
      currentUser.role !== UserRole.SUPER_ADMIN &&
      dto.role &&
      dto.role !== UserRole.USER
    ) {
      throw new ForbiddenException('只有超级管理员可以创建管理员账号');
    }
    const existing = await this.usersRepository.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('该邮箱已被注册');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = this.usersRepository.create({
      email: dto.email,
      password: hashedPassword,
      username: dto.username,
      role: dto.role || UserRole.USER,
      isActive: true,
    });

    const saved = await this.usersRepository.save(user);
    return this.formatUser(saved);
  }

  async update(id: string, dto: UpdateUserDto, currentUser: User) {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('用户不存在');

    this.checkPermission(currentUser, user, dto);

    if (dto.username !== undefined) user.username = dto.username;
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;

    const saved = await this.usersRepository.save(user);
    return this.formatUser(saved);
  }

  async toggleActive(id: string, currentUser: User) {
    if (id === currentUser.id) {
      throw new ForbiddenException('不能禁用自己的账号');
    }

    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('用户不存在');

    this.checkPermission(currentUser, user);

    user.isActive = !user.isActive;
    const saved = await this.usersRepository.save(user);
    return this.formatUser(saved);
  }

  async resetPassword(id: string, currentUser: User) {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('用户不存在');

    this.checkPermission(currentUser, user);

    // 生成 12 位随机密码
    const newPassword = crypto.randomBytes(9).toString('base64').slice(0, 12);
    user.password = await bcrypt.hash(newPassword, 10);
    user.passwordChangedAt = new Date();
    await this.usersRepository.save(user);

    return { newPassword };
  }

  /**
   * 权限检查：
   * - 不能操作自己的角色/状态
   * - super_admin 不可被任何人通过接口修改
   * - admin 只能操作普通用户，不能操作其他 admin/super_admin
   */
  private checkPermission(
    currentUser: User,
    targetUser: User,
    dto?: UpdateUserDto,
  ) {
    // 不能操作超级管理员
    if (targetUser.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('不能修改超级管理员');
    }

    // 操作自己的限制
    if (currentUser.id === targetUser.id) {
      if (dto?.role !== undefined && dto.role !== targetUser.role) {
        throw new ForbiddenException('不能修改自己的角色');
      }
      if (dto?.isActive === false) {
        throw new ForbiddenException('不能禁用自己的账号');
      }
      return;
    }

    // 普通 admin 不能操作其他 admin
    if (
      currentUser.role !== UserRole.SUPER_ADMIN &&
      targetUser.role === UserRole.ADMIN
    ) {
      throw new ForbiddenException('普通管理员不能操作其他管理员');
    }
  }

  private formatUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      avatar: user.avatar,
      role: user.role,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };
  }
}
