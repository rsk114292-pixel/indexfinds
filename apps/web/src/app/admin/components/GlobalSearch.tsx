'use client';

/**
 * 全局搜索组件（Cmd+K / Ctrl+K）
 * 搜索范围：产品、品牌、分类、后台页面
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Modal, Input, Empty, Spin, Tag } from 'antd';
import type { InputRef } from 'antd';
import {
  SearchOutlined,
  ShoppingOutlined,
  TagsOutlined,
  AppstoreOutlined,
  SettingOutlined,
  DashboardOutlined,
  BarChartOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { get } from '@/lib/api';

interface SearchProduct {
  id: string;
  title: string;
  chineseTitle: string;
  slug: string;
  brand?: { name: string } | null;
  images?: string[];
}

interface SearchBrand {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  productCount?: number;
}

interface SearchCategory {
  id: string;
  name: string;
  chineseName: string;
  slug: string;
  productCount?: number;
}

interface SearchSuggestions {
  brands: SearchBrand[];
  products: SearchProduct[];
  categories: SearchCategory[];
}

// 后台页面快捷导航
const adminPages = [
  { path: '/admin/dashboard', label: '仪表盘', icon: <DashboardOutlined />, keywords: ['仪表盘', 'dashboard', '首页', '概览'] },
  { path: '/admin/products', label: '产品列表', icon: <ShoppingOutlined />, keywords: ['产品', 'products', '商品'] },
  { path: '/admin/products/import', label: '批量导入', icon: <ShoppingOutlined />, keywords: ['导入', 'import', '批量'] },
  { path: '/admin/products?tab=review', label: '普通上传待审核', icon: <ShoppingOutlined />, keywords: ['审核', 'review', '待审核', '普通上传'] },
  { path: '/admin/products?tab=sku-review', label: 'SKU拆分待审核', icon: <ShoppingOutlined />, keywords: ['sku', '拆分', '待审核', 'sku拆分'] },
  { path: '/admin/products?tab=mixed', label: '混合产品', icon: <ShoppingOutlined />, keywords: ['混合', 'mixed', '多品牌'] },
  { path: '/admin/products/split-history', label: '拆分历史', icon: <ShoppingOutlined />, keywords: ['拆分', 'split', '历史'] },
  { path: '/admin/categories', label: '分类管理', icon: <AppstoreOutlined />, keywords: ['分类', 'categories', '类目'] },
  { path: '/admin/brands', label: '品牌管理', icon: <TagsOutlined />, keywords: ['品牌', 'brands'] },
  { path: '/admin/analytics/search', label: '搜索分析', icon: <BarChartOutlined />, keywords: ['搜索分析', 'analytics', '分析'] },
  { path: '/admin/analytics/seo', label: 'SEO 落地页', icon: <BarChartOutlined />, keywords: ['seo', '落地页', 'platform landing', 'topic'] },
  { path: '/admin/analytics/clicks', label: '点击追踪', icon: <BarChartOutlined />, keywords: ['点击', 'clicks', '追踪'] },
  { path: '/admin/analytics/referrals', label: '推荐码分析', icon: <BarChartOutlined />, keywords: ['推荐', 'referrals', '推荐码'] },
  { path: '/admin/analytics/vectors', label: '向量管理', icon: <BarChartOutlined />, keywords: ['向量', 'vectors', 'embedding'] },
  { path: '/admin/settings/platforms', label: '平台配置', icon: <SettingOutlined />, keywords: ['平台', 'platforms', '微店'] },
  { path: '/admin/settings/ai', label: 'AI 配置', icon: <SettingOutlined />, keywords: ['ai', '模型', 'openai'] },
  { path: '/admin/settings/cache', label: '缓存管理', icon: <SettingOutlined />, keywords: ['缓存', 'cache', 'isr'] },
  { path: '/admin/settings/visual-search', label: '以图搜图', icon: <SettingOutlined />, keywords: ['搜图', 'visual', '图片搜索'] },
  { path: '/admin/settings/general', label: '常规设置', icon: <SettingOutlined />, keywords: ['设置', 'settings', '常规'] },
  { path: '/admin/account/login-logs', label: '登录日志', icon: <SafetyOutlined />, keywords: ['登录', 'login', '日志', '安全'] },
  { path: '/admin/account/password', label: '修改密码', icon: <SafetyOutlined />, keywords: ['密码', 'password', '修改'] },
];

export default function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchSuggestions | null>(null);
  const [matchedPages, setMatchedPages] = useState<typeof adminPages>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const inputRef = useRef<InputRef>(null);

  // Cmd+K / Ctrl+K 快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 搜索逻辑
  const doSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults(null);
      setMatchedPages([]);
      setLoading(false);
      return;
    }

    // 匹配后台页面
    const lower = trimmed.toLowerCase();
    const pages = adminPages.filter((p) =>
      p.label.toLowerCase().includes(lower) ||
      p.keywords.some((kw) => kw.toLowerCase().includes(lower))
    );
    setMatchedPages(pages);

    // 搜索后端 API
    setLoading(true);
    try {
      const data = await get<SearchSuggestions>('/products/suggest', { q: trimmed });
      setResults(data);
    } catch {
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // 输入防抖
  const handleInputChange = (value: string) => {
    setQuery(value);
    setActiveIndex(0);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 300);
  };

  // 关闭时重置
  const handleClose = () => {
    setOpen(false);
    setQuery('');
    setResults(null);
    setMatchedPages([]);
    setActiveIndex(0);
  };

  // 导航
  const handleNavigate = (path: string) => {
    router.push(path);
    handleClose();
  };

  // 构造扁平化结果列表（用于键盘导航）
  const flatItems: { key: string; path: string; type: string }[] = [];
  matchedPages.forEach((p) => flatItems.push({ key: `page-${p.path}`, path: p.path, type: 'page' }));
  results?.products?.forEach((p) => flatItems.push({ key: `product-${p.id}`, path: `/admin/products/${p.id}`, type: 'product' }));
  results?.brands?.forEach((b) => flatItems.push({ key: `brand-${b.id}`, path: `/admin/brands?search=${encodeURIComponent(b.name)}`, type: 'brand' }));
  results?.categories?.forEach((c) => flatItems.push({ key: `category-${c.id}`, path: `/admin/categories?search=${encodeURIComponent(c.name)}`, type: 'category' }));

  // 键盘导航
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, flatItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && flatItems[activeIndex]) {
      e.preventDefault();
      handleNavigate(flatItems[activeIndex].path);
    }
  };

  const hasResults = matchedPages.length > 0 ||
    (results && (results.products?.length > 0 || results.brands?.length > 0 || results.categories?.length > 0));

  let currentFlatIndex = 0;

  return (
    <>
      {/* Header 中的搜索触发按钮 */}
      <button
        onClick={() => setOpen(true)}
        className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-colors cursor-pointer"
      >
        <SearchOutlined />
        <span>搜索...</span>
        <kbd className="ml-2 px-1.5 py-0.5 text-xs font-mono bg-white border border-gray-200 rounded">⌘K</kbd>
      </button>

      {/* 搜索弹窗 */}
      <Modal
        open={open}
        onCancel={handleClose}
        footer={null}
        closable={false}
        width={600}
        styles={{
          body: { padding: 0 },
          content: { padding: 0, borderRadius: 12, overflow: 'hidden' },
        }}
        className="global-search-modal"
      >
        <div onKeyDown={handleKeyDown}>
          {/* 搜索输入框 */}
          <div className="p-3 border-b border-gray-100">
            <Input
              ref={inputRef}
              placeholder="搜索产品、品牌、分类或页面..."
              prefix={<SearchOutlined className="text-gray-400" />}
              suffix={loading ? <Spin size="small" /> : null}
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              variant="borderless"
              size="large"
              autoFocus
            />
          </div>

          {/* 搜索结果 */}
          <div className="max-h-[400px] overflow-y-auto">
            {!query.trim() && (
              <div className="p-6 text-center text-gray-400 text-sm">
                输入关键词搜索产品、品牌、分类或快速跳转到后台页面
              </div>
            )}

            {query.trim() && !loading && !hasResults && (
              <div className="py-8">
                <Empty description="未找到相关结果" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              </div>
            )}

            {/* 后台页面 */}
            {matchedPages.length > 0 && (
              <div>
                <div className="px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider bg-gray-50">
                  快捷导航
                </div>
                {matchedPages.map((page) => {
                  const idx = currentFlatIndex++;
                  return (
                    <div
                      key={page.path}
                      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                        idx === activeIndex ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => handleNavigate(page.path)}
                    >
                      <span className="text-gray-400">{page.icon}</span>
                      <span className="flex-1">{page.label}</span>
                      <Tag bordered={false} color="default" className="text-xs">页面</Tag>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 产品 */}
            {results?.products && results.products.length > 0 && (
              <div>
                <div className="px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider bg-gray-50">
                  产品
                </div>
                {results.products.map((product) => {
                  const idx = currentFlatIndex++;
                  return (
                    <div
                      key={product.id}
                      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                        idx === activeIndex ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => handleNavigate(`/admin/products/${product.id}`)}
                    >
                      {product.images?.[0] ? (
                         
                        <img src={product.images[0]} alt="" className="w-8 h-8 rounded object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center">
                          <ShoppingOutlined className="text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="truncate text-sm">{product.title || product.chineseTitle}</div>
                        {product.brand?.name && (
                          <div className="text-xs text-gray-400 truncate">{product.brand.name}</div>
                        )}
                      </div>
                      <Tag bordered={false} color="blue" className="text-xs">产品</Tag>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 品牌 */}
            {results?.brands && results.brands.length > 0 && (
              <div>
                <div className="px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider bg-gray-50">
                  品牌
                </div>
                {results.brands.map((brand) => {
                  const idx = currentFlatIndex++;
                  return (
                    <div
                      key={brand.id}
                      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                        idx === activeIndex ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => handleNavigate(`/admin/brands?search=${encodeURIComponent(brand.name)}`)}
                    >
                      {brand.logoUrl ? (
                         
                        <img src={brand.logoUrl} alt="" className="w-8 h-8 rounded object-contain bg-gray-50" />
                      ) : (
                        <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center">
                          <TagsOutlined className="text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="truncate text-sm">{brand.name}</div>
                        {brand.productCount !== undefined && (
                          <div className="text-xs text-gray-400">{brand.productCount} 个产品</div>
                        )}
                      </div>
                      <Tag bordered={false} color="green" className="text-xs">品牌</Tag>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 分类 */}
            {results?.categories && results.categories.length > 0 && (
              <div>
                <div className="px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider bg-gray-50">
                  分类
                </div>
                {results.categories.map((category) => {
                  const idx = currentFlatIndex++;
                  return (
                    <div
                      key={category.id}
                      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                        idx === activeIndex ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => handleNavigate(`/admin/categories?search=${encodeURIComponent(category.name)}`)}
                    >
                      <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center">
                        <AppstoreOutlined className="text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="truncate text-sm">{category.chineseName || category.name}</div>
                        {category.productCount !== undefined && (
                          <div className="text-xs text-gray-400">{category.productCount} 个产品</div>
                        )}
                      </div>
                      <Tag bordered={false} color="orange" className="text-xs">分类</Tag>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 底部快捷键提示 */}
          {query.trim() && (
            <div className="px-4 py-2 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-400 bg-gray-50">
              <span><kbd className="px-1 py-0.5 bg-white border border-gray-200 rounded text-xs">↑↓</kbd> 导航</span>
              <span><kbd className="px-1 py-0.5 bg-white border border-gray-200 rounded text-xs">↵</kbd> 打开</span>
              <span><kbd className="px-1 py-0.5 bg-white border border-gray-200 rounded text-xs">Esc</kbd> 关闭</span>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
