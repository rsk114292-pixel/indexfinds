'use client';

/**
 * 后台页面骨架屏组件
 * 替代 <Spin /> 居中的加载状态，提供更好的用户体验
 */
import { Skeleton, Card, Row, Col } from 'antd';

/** 表格列表页骨架屏 */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div>
      {/* 标题 + 按钮 */}
      <div className="flex justify-between items-center mb-4">
        <Skeleton.Input active style={{ width: 150, height: 32 }} />
        <Skeleton.Button active style={{ width: 100 }} />
      </div>
      {/* 搜索栏 */}
      <Card className="mb-4">
        <div className="flex gap-3">
          <Skeleton.Input active style={{ width: 250 }} />
          <Skeleton.Button active style={{ width: 60 }} />
        </div>
      </Card>
      {/* 表格 */}
      <Card>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-3 border-b border-gray-50 last:border-0">
            <Skeleton.Avatar active size="small" shape="square" />
            <Skeleton.Input active size="small" style={{ width: '40%' }} />
            <Skeleton.Input active size="small" style={{ width: '15%' }} />
            <Skeleton.Input active size="small" style={{ width: '10%' }} />
            <Skeleton.Button active size="small" style={{ width: 60 }} />
          </div>
        ))}
      </Card>
    </div>
  );
}

/** 仪表盘/统计页骨架屏 */
export function DashboardSkeleton() {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <Skeleton.Input active style={{ width: 120, height: 32 }} />
        <Skeleton.Button active style={{ width: 80 }} />
      </div>
      {/* 统计卡片 */}
      <Row gutter={[16, 16]} className="mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Col xs={12} sm={6} key={i}>
            <Card>
              <Skeleton active paragraph={{ rows: 1 }} title={{ width: '60%' }} />
            </Card>
          </Col>
        ))}
      </Row>
      <Row gutter={[16, 16]}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Col xs={12} sm={6} key={i}>
            <Card>
              <Skeleton active paragraph={{ rows: 1 }} title={{ width: '50%' }} />
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}

/** 表单/详情页骨架屏 */
export function FormSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <Skeleton.Input active style={{ width: 200, height: 32 }} />
      </div>
      <Card>
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="mb-6">
            <Skeleton.Input active size="small" style={{ width: 80, marginBottom: 8, display: 'block' }} />
            <Skeleton.Input active style={{ width: '100%' }} />
          </div>
        ))}
        <div className="flex gap-2 justify-end mt-4">
          <Skeleton.Button active style={{ width: 80 }} />
          <Skeleton.Button active style={{ width: 80 }} />
        </div>
      </Card>
    </div>
  );
}

/** 通用页面骨架屏 */
export function PageSkeleton() {
  return (
    <div>
      <Skeleton active paragraph={{ rows: 1 }} className="mb-4" />
      <Card>
        <Skeleton active paragraph={{ rows: 8 }} />
      </Card>
    </div>
  );
}
