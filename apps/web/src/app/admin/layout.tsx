'use client';

/**
 * Admin Layout
 * 后台管理布局（浅色侧边栏 + 面包屑 + 响应式）
 * 权限检查：仅 Admin 角色可访问
 */
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Layout, Menu, Avatar, Dropdown, Spin, App, Drawer, Button } from 'antd';
import { LogoutOutlined, UserOutlined, MenuOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/stores/useAuthStore';
import { post } from '@/lib/api';
import { adminMenuItems, getSelectedKeys, getOpenKeys } from './route-config';
import { getSiteName } from '@/lib/site-config';
import AdminBreadcrumb from './components/AdminBreadcrumb';
import GlobalSearch from './components/GlobalSearch';
import { useAdminAuthReady } from './useAdminAuthReady';

const { Header, Sider, Content } = Layout;

function AdminFullscreenSpinner() {
  return (
    <div className="flex h-screen items-center justify-center">
      <Spin size="large" />
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { message } = App.useApp();
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuthStore();
  const { status, user, isReady } = useAdminAuthReady();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openKeys, setOpenKeys] = useState<string[]>(getOpenKeys(pathname));

  // 权限检查
  useEffect(() => {
    // 登录页不需要验证
    if (pathname === '/admin/login') return;

    if (status === 'unauthenticated') {
      router.replace('/admin/login');
      return;
    }

    if (status === 'forbidden') {
      message.error('您没有权限访问管理后台');
      router.replace('/');
    }
  }, [message, pathname, router, status]);

  // 登录页不显示 admin layout
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  // 后台页面必须等到 access token 恢复完成后才能渲染，
  // 否则子页面会在首屏阶段提前触发受保护请求，打出无意义的 401。
  if (status === 'hydrating' || status === 'recovering_token') {
    return <AdminFullscreenSpinner />;
  }

  if (!isReady) {
    return <AdminFullscreenSpinner />;
  }

  const handleMenuClick = (e: { key: string }) => {
    router.push(e.key);
  };

  const handleLogout = async () => {
    try {
      await post('/auth/logout'); // 调用后端 API 撤销 token
    } catch {
      // 即使 API 失败也继续登出
    }
    logout(); // 清除本地状态
    router.replace('/admin/login');
    message.success('已成功登出');
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: user?.username || user?.email,
      disabled: true,
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  // 侧边栏菜单（桌面端和移动端 Drawer 共用）
  const sidebarMenu = (
    <>
      <div className="flex h-14 items-center px-4 border-b border-gray-100">
        <h1 className={`font-semibold text-gray-800 ${collapsed ? 'text-sm' : 'text-base'}`}>
          {collapsed ? '' : `${getSiteName()} 管理后台`}
        </h1>
      </div>
      <Menu
        mode="inline"
        selectedKeys={getSelectedKeys(pathname)}
        openKeys={openKeys}
        onOpenChange={setOpenKeys}
        items={adminMenuItems}
        onClick={(e) => {
          handleMenuClick(e);
          setMobileOpen(false);
        }}
        style={{ border: 'none', background: 'transparent' }}
      />
    </>
  );

  return (
    <Layout className="min-h-screen">
      {/* 桌面侧边栏 */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="light"
        width={240}
        collapsedWidth={80}
        trigger={null}
        className="!hidden lg:!block border-r border-gray-200"
        style={{ background: '#fff' }}
      >
        {sidebarMenu}
      </Sider>

      {/* 移动端 Drawer */}
      <Drawer
        placement="left"
        onClose={() => setMobileOpen(false)}
        open={mobileOpen}
        width={260}
        styles={{ body: { padding: 0 } }}
        className="lg:hidden"
      >
        {sidebarMenu}
      </Drawer>
      <Layout>
        <Header className="bg-white px-4 lg:px-6 flex items-center justify-between shadow-sm h-14 leading-[56px]" style={{ padding: undefined }}>
          <div className="flex items-center gap-2">
            {/* 移动端：汉堡菜单 */}
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setMobileOpen(true)}
              className="lg:hidden"
            />
            {/* 桌面端：折叠按钮 */}
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:inline-flex"
            />
            <GlobalSearch />
          </div>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div className="flex items-center cursor-pointer gap-2">
              <Avatar icon={<UserOutlined />} size="small" src={user?.avatar} />
              <span className="text-gray-700 text-sm hidden sm:inline">{user?.username || user?.email}</span>
            </div>
          </Dropdown>
        </Header>
        <Content className="m-3 lg:m-4">
          <AdminBreadcrumb />
          <div className="p-4 lg:p-6 bg-white rounded-lg min-h-[280px]">
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
