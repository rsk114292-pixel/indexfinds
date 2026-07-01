import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, In } from 'typeorm';
import { Attribute } from './entities/attribute.entity';
import { AttributeValue } from './entities/attribute-value.entity';

@Injectable()
export class AttributesService {
  private readonly logger = new Logger(AttributesService.name);

  constructor(
    @InjectRepository(Attribute)
    private readonly attributeRepository: Repository<Attribute>,
    @InjectRepository(AttributeValue)
    private readonly attributeValueRepository: Repository<AttributeValue>,
  ) {}

  /** Find an attribute by name */
  async findAttributeByName(name: string): Promise<Attribute | null> {
    return this.attributeRepository.findOne({ where: { name } });
  }

  /** Find attribute values by attribute name and value slugs */
  async findAttributeValuesBySlug(
    attributeName: string,
    slugs: string[],
  ): Promise<AttributeValue[]> {
    if (!slugs.length) return [];
    return this.attributeValueRepository.find({
      where: {
        attribute: { name: attributeName },
        slug: In(slugs),
      },
      relations: ['attribute'],
    });
  }

  /** Get all attribute values for a given dimension, ordered by sortOrder */
  async getAttributeValues(attributeName: string): Promise<AttributeValue[]> {
    return this.attributeValueRepository.find({
      where: { attribute: { name: attributeName } },
      relations: ['attribute'],
      order: { sortOrder: 'ASC' },
    });
  }

  /**
   * Sync product attribute values - replaces all existing associations.
   * Supports an external EntityManager for transaction safety.
   */
  async syncProductAttributes(
    productId: string,
    attributeValueIds: string[],
    manager?: EntityManager,
  ): Promise<void> {
    const em = manager || this.attributeValueRepository.manager;

    // Delete existing associations
    await em.query(
      `DELETE FROM product_attribute_values WHERE product_id = $1`,
      [productId],
    );

    if (!attributeValueIds.length) return;

    // Build parameterized INSERT with numbered placeholders
    const params: string[] = [productId];
    const valuesClauses: string[] = [];

    for (let i = 0; i < attributeValueIds.length; i++) {
      params.push(attributeValueIds[i]);
      // $1 is always productId, $2..$N are attribute_value_ids
      valuesClauses.push(`($1, $${i + 2})`);
    }

    await em.query(
      `INSERT INTO product_attribute_values (product_id, attribute_value_id)
       VALUES ${valuesClauses.join(', ')}
       ON CONFLICT DO NOTHING`,
      params,
    );
  }

  /** Get a product's associated attribute value IDs */
  async getProductAttributeValueIds(productId: string): Promise<string[]> {
    const rows = await this.attributeValueRepository.manager.query(
      `SELECT attribute_value_id FROM product_attribute_values WHERE product_id = $1`,
      [productId],
    );
    return rows.map((r: any) => r.attribute_value_id);
  }

  /** Get all attributes with their values and product counts (for admin summary) */
  async getAttributeSummary(): Promise<
    Array<{
      id: string;
      name: string;
      displayName: string;
      type: string;
      sortOrder: number;
      values: Array<{
        id: string;
        value: string;
        slug: string;
        sortOrder: number;
        hexCode: string | null;
        productCount: number;
      }>;
    }>
  > {
    const attributes = await this.attributeRepository.find({
      order: { sortOrder: 'ASC' },
    });

    const result = [];

    for (const attr of attributes) {
      const rows = await this.attributeValueRepository.manager.query(
        `SELECT
           av.id,
           av.value,
           av.slug,
           av.sort_order AS "sortOrder",
           c."hexCode",
           COUNT(pav.product_id)::int AS "productCount"
         FROM attribute_values av
         LEFT JOIN product_attribute_values pav ON pav.attribute_value_id = av.id
           AND EXISTS (SELECT 1 FROM products p WHERE p.id = pav.product_id AND p.status = 'active')
         LEFT JOIN colors c ON c.id = av.ref_color_id
         WHERE av.attribute_id = $1
         GROUP BY av.id, av.value, av.slug, av.sort_order, c."hexCode"
         ORDER BY av.sort_order ASC`,
        [attr.id],
      );

      result.push({
        id: attr.id,
        name: attr.name,
        displayName: attr.displayName,
        type: attr.type,
        sortOrder: attr.sortOrder,
        values: rows,
      });
    }

    return result;
  }
}
