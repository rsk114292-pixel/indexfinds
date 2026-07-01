'use client';

import { useState } from 'react';
import { Button, Modal, Space, Typography } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

const glossaryItems = [
  {
    title: '首方访问 first-party visit',
    description:
      '内部流量报表使用的 visit_id 口径，按 30 分钟 inactivity、campaign 变化和浏览器上下文变化切分。',
  },
  {
    title: '首方访问设备 first-party visitor/device',
    description:
      '内部设备口径使用 device_id。它更接近长期浏览器标识，不等于 GA4 active users。',
  },
  {
    title: 'GA4 session',
    description:
      'GA4 在客户端脚本、consent 和浏览器环境允许的前提下记录的会话。它天然会小于首方访问。',
  },
  {
    title: 'GA4 active user',
    description:
      'GA4 的活跃用户口径依赖 Google 的客户端测量模型，不能和首方设备数直接对比。',
  },
  {
    title: 'referral click',
    description:
      '短链 `/r/[code]` 命中时在服务端先记录的点击。它发生在真正落地之前。',
  },
  {
    title: 'landing visit',
    description:
      '用户真正到达站内页面后的首方落地记录。它可能携带 ref_click_id、referral_code、consent_status 和 GA diagnostics。',
  },
  {
    title: '直接/未归因访问 direct/unattributed visit',
    description:
      '当前页面里的直接/未归因访问指无 UTM 且无外部 Referrer，不等于用户手动输入网址。Direct 拆解会继续区分正常 Direct、推荐分享缺来源、WebView 丢来源和疑似自动化 Direct。',
  },
  {
    title: 'outbound rate',
    description:
      '当前运营页里的访问外跳率 = 有外跳访问 / 去重访问。有外跳访问按 visit_id/session_id 去重，不等于外跳点击事件总数。',
  },
  {
    title: 'high-intent visitor',
    description:
      '当前流量页里的高意向访客，指在当前时间窗内浏览至少 3 个不同商品，且至少发生过一次收藏或购买外跳的访客。这个口径允许匿名访客。',
  },
  {
    title: 'activated user',
    description:
      '当前流量页里的激活用户，指已验证邮箱的用户在当前时间窗内浏览至少 3 个不同商品，且至少发生过一次收藏或购买外跳；它不限制用户必须在当前时间窗注册。',
  },
  {
    title: 'effective new user',
    description:
      '当前流量页里的有效新用户，指在当前时间窗内完成注册、邮箱验证、浏览至少 3 个不同商品，且至少发生过一次收藏或购买外跳的用户。它专门用于看拉新质量。',
  },
];

export default function MetricGlossaryModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        icon={<InfoCircleOutlined />}
        onClick={() => setOpen(true)}
      >
        查看指标口径
      </Button>
      <Modal
        title="流量指标口径说明"
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        width={720}
      >
        <Space direction="vertical" size={16} className="w-full">
          {glossaryItems.map((item) => (
            <div key={item.title} className="rounded border border-slate-200 p-4">
              <Typography.Text strong>{item.title}</Typography.Text>
              <Typography.Paragraph className="mb-0 mt-2 text-slate-600">
                {item.description}
              </Typography.Paragraph>
            </div>
          ))}
        </Space>
      </Modal>
    </>
  );
}
