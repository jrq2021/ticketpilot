import type {
  ActionDraft,
  AgentRecommendation,
  Customer,
  KnowledgeDoc,
  Product,
  ServiceOpsStore,
  Ticket,
  WarrantyPolicy
} from '../../types/serviceops.ts'

const customers: Customer[] = [
  { id: 'cus-1001', name: '林晨', tier: 'plus', city: '杭州', phoneMasked: '138****6031', lifetimeValue: 12880 },
  { id: 'cus-1002', name: '周屿', tier: 'enterprise', city: '深圳', phoneMasked: '186****8820', lifetimeValue: 31240 },
  { id: 'cus-1003', name: '郑宁', tier: 'standard', city: '成都', phoneMasked: '159****0194', lifetimeValue: 4680 },
  { id: 'cus-1004', name: '许安', tier: 'plus', city: '苏州', phoneMasked: '137****7210', lifetimeValue: 15920 },
  { id: 'cus-1005', name: '陈予', tier: 'standard', city: '武汉', phoneMasked: '181****4402', lifetimeValue: 7380 }
]

const products: Product[] = [
  {
    id: 'prd-air-01',
    name: 'AeroClean X2 智能空气管家',
    line: 'air',
    model: 'AC-X2',
    warrantyMonths: 24,
    avgRepairCost: 260,
    replacementCost: 1499
  },
  {
    id: 'prd-lock-02',
    name: 'SecureHome P9 智能门锁',
    line: 'lock',
    model: 'SH-P9',
    warrantyMonths: 36,
    avgRepairCost: 420,
    replacementCost: 2199
  },
  {
    id: 'prd-vac-03',
    name: 'SweepBot Max 扫拖机器人',
    line: 'vacuum',
    model: 'SB-MAX',
    warrantyMonths: 24,
    avgRepairCost: 360,
    replacementCost: 2699
  },
  {
    id: 'prd-cam-04',
    name: 'VistaCam Pro 家用摄像头',
    line: 'camera',
    model: 'VC-PRO',
    warrantyMonths: 18,
    avgRepairCost: 180,
    replacementCost: 699
  }
]

const policies: WarrantyPolicy[] = [
  {
    id: 'pol-air',
    productLine: 'air',
    coverageMonths: 24,
    exclusions: ['滤芯耗材不在整机质保范围', '水浸、摔落、人为拆机不保'],
    repairRules: ['购买 24 个月内主板、电机故障免费维修', '同一故障 30 天内复发优先换新'],
    replacementRules: ['到货 7 天内性能故障可换新', '维修 2 次仍无法解决可升级换新审批']
  },
  {
    id: 'pol-lock',
    productLine: 'lock',
    coverageMonths: 36,
    exclusions: ['暴力撬锁痕迹不保', '非官方电池漏液导致损坏不保'],
    repairRules: ['指纹模组、电机、主板 36 个月保修', '门体安装问题需先派安装工程师复核'],
    replacementRules: ['安全风险故障优先派工，确认主板故障后可换新']
  },
  {
    id: 'pol-vacuum',
    productLine: 'vacuum',
    coverageMonths: 24,
    exclusions: ['尘盒、边刷、拖布等耗材不保', '液体进入主机不保'],
    repairRules: ['激光雷达、电池、主驱动轮 24 个月保修', '地图异常需先完成固件升级和重建地图'],
    replacementRules: ['核心部件维修 2 次仍失败，可申请同型号换新']
  },
  {
    id: 'pol-camera',
    productLine: 'camera',
    coverageMonths: 18,
    exclusions: ['私自刷机、拆机不保', '户外雨淋导致进水不保'],
    repairRules: ['镜头、主板、Wi-Fi 模组 18 个月保修', '云服务问题需先排查账号与套餐状态'],
    replacementRules: ['到货 7 天内无法联网可换新']
  }
]

const knowledgeDocs: KnowledgeDoc[] = [
  {
    id: 'doc-air-e11',
    title: 'AC-X2 故障码 E11 排查手册',
    productLine: 'air',
    category: '故障诊断',
    content: 'E11 表示风机转速异常。先检查进风口和滤网堵塞，再检查电机线束。若清洁后仍报错且购买未超过 24 个月，应创建免费检修工单。',
    updatedAt: '2026-05-08T09:00:00.000Z'
  },
  {
    id: 'doc-lock-battery',
    title: 'SH-P9 电池漏液与低电量策略',
    productLine: 'lock',
    category: '风险规则',
    content: '非官方电池漏液造成腐蚀属于人为因素。低电量无法开锁且无撬锁痕迹时，应先远程指导应急供电，再预约工程师检测锁体电机。',
    updatedAt: '2026-05-10T10:20:00.000Z'
  },
  {
    id: 'doc-vac-map',
    title: 'SB-MAX 地图漂移处理流程',
    productLine: 'vacuum',
    category: '故障诊断',
    content: '地图漂移优先检查固件版本、充电座位置和激光雷达遮挡。完成固件升级与重建地图后仍复现，可判断为雷达模组异常。',
    updatedAt: '2026-05-12T14:15:00.000Z'
  },
  {
    id: 'doc-camera-cloud',
    title: 'VC-PRO 录像丢失排查流程',
    productLine: 'camera',
    category: '服务策略',
    content: '录像丢失需区分本地设备离线、云套餐到期和云端服务异常。云服务问题不应直接换新，应先检查账号套餐和设备在线率。',
    updatedAt: '2026-05-13T11:40:00.000Z'
  },
  {
    id: 'doc-service-level',
    title: '售后优先级与 SLA 标准',
    productLine: 'all',
    category: 'SLA',
    content: '安全风险、无法开锁、设备发热异味为 P0/P1，需要 2 小时内人工确认。普通功能异常 8 小时内响应，耗材问题可引导自助处理。',
    updatedAt: '2026-05-15T08:35:00.000Z'
  },
  {
    id: 'doc-replace-policy',
    title: '换新与退款审批边界',
    productLine: 'all',
    category: '审批',
    content: '换新、退款、补偿券和投诉升级必须由坐席或主管确认。AI 可预填原因、证据和建议，但不得自动执行资金或库存动作。',
    updatedAt: '2026-05-17T16:15:00.000Z'
  }
]

const tickets: Ticket[] = [
  {
    id: 'tkt-24001',
    orderNo: 'SO202604180091',
    title: '空气管家反复 E11，用户要求换新',
    customerId: 'cus-1001',
    productId: 'prd-air-01',
    serialNumber: 'ACX2-HZ-240418-8891',
    channel: 'app',
    priority: 'high',
    category: '故障诊断',
    issue: '设备开机 5 分钟后报 E11，用户已更换滤芯并重启，仍反复出现。客户表示购买不到 2 个月，希望直接换新。',
    purchasedAt: '2026-04-18T08:00:00.000Z',
    createdAt: '2026-05-22T02:20:00.000Z',
    slaDueAt: '2026-05-22T10:20:00.000Z',
    status: 'new',
    estimatedManualMinutes: 28,
    aiAssistedMinutes: 9,
    tags: ['保内', '复发', '换新诉求'],
    transcript: [
      { speaker: 'customer', at: '2026-05-22T02:20:00.000Z', text: '机器又 E11 了，上周已经按客服说的清理滤网。' },
      { speaker: 'agent', at: '2026-05-22T02:23:00.000Z', text: '请问滤芯是否为官方滤芯，清理后是否重新插拔电源？' },
      { speaker: 'customer', at: '2026-05-22T02:30:00.000Z', text: '官方滤芯，重启也没用，想换新。' }
    ]
  },
  {
    id: 'tkt-24002',
    orderNo: 'SO202402120448',
    title: '智能门锁低电量后无法开锁',
    customerId: 'cus-1002',
    productId: 'prd-lock-02',
    serialNumber: 'SHP9-SZ-240212-1045',
    channel: 'phone',
    priority: 'urgent',
    category: '安全风险',
    issue: '企业客户宿舍门锁提示低电量后无法开锁，无撬锁痕迹，现场使用应急电源可唤醒但电机无响应。',
    purchasedAt: '2024-02-12T08:00:00.000Z',
    createdAt: '2026-05-22T03:05:00.000Z',
    slaDueAt: '2026-05-22T05:05:00.000Z',
    status: 'new',
    estimatedManualMinutes: 42,
    aiAssistedMinutes: 13,
    tags: ['P0', '企业客户', '派工'],
    transcript: [
      { speaker: 'customer', at: '2026-05-22T03:05:00.000Z', text: '宿舍门打不开，已经影响员工进出。' },
      { speaker: 'agent', at: '2026-05-22T03:08:00.000Z', text: '现场是否有撬锁或电池漏液痕迹？' },
      { speaker: 'customer', at: '2026-05-22T03:11:00.000Z', text: '没有撬锁，用应急电源能亮屏，但听不到电机动作。' }
    ]
  },
  {
    id: 'tkt-24003',
    orderNo: 'SO202308090306',
    title: '扫拖机器人地图漂移，申请免费维修',
    customerId: 'cus-1003',
    productId: 'prd-vac-03',
    serialNumber: 'SBM-CD-230809-7630',
    channel: 'wechat',
    priority: 'medium',
    category: '故障诊断',
    issue: '机器人清扫时地图整体偏移，重启后短暂恢复。用户未升级固件，不确定是否在保修期。',
    purchasedAt: '2023-08-09T08:00:00.000Z',
    createdAt: '2026-05-21T09:10:00.000Z',
    slaDueAt: '2026-05-21T17:10:00.000Z',
    status: 'diagnosed',
    estimatedManualMinutes: 24,
    aiAssistedMinutes: 8,
    tags: ['疑似过保', '需远程指导'],
    transcript: [
      { speaker: 'customer', at: '2026-05-21T09:10:00.000Z', text: '地图总是歪，之前没出现过。' },
      { speaker: 'agent', at: '2026-05-21T09:16:00.000Z', text: '请确认固件版本和充电座位置。' }
    ]
  },
  {
    id: 'tkt-24004',
    orderNo: 'SO202505030210',
    title: '摄像头录像缺失，用户要求退款',
    customerId: 'cus-1004',
    productId: 'prd-cam-04',
    serialNumber: 'VCP-SU-250503-4312',
    channel: 'app',
    priority: 'high',
    category: '服务策略',
    issue: '用户反馈过去 48 小时云录像不完整，设备在线率正常，但云存储套餐昨天到期。用户要求全额退款。',
    purchasedAt: '2025-05-03T08:00:00.000Z',
    createdAt: '2026-05-22T04:50:00.000Z',
    slaDueAt: '2026-05-22T12:50:00.000Z',
    status: 'new',
    estimatedManualMinutes: 32,
    aiAssistedMinutes: 11,
    tags: ['云服务', '退款诉求', '风险沟通'],
    transcript: [
      { speaker: 'customer', at: '2026-05-22T04:50:00.000Z', text: '昨天到今天的录像没有了，这个摄像头完全不可靠。' },
      { speaker: 'agent', at: '2026-05-22T04:56:00.000Z', text: '后台显示设备在线，请问云存储套餐是否续费？' }
    ]
  },
  {
    id: 'tkt-24005',
    orderNo: 'SO202507220766',
    title: '空气管家异味，疑似进水后仍要求保修',
    customerId: 'cus-1005',
    productId: 'prd-air-01',
    serialNumber: 'ACX2-WH-250722-5548',
    channel: 'store',
    priority: 'medium',
    category: '风险规则',
    issue: '线下门店反馈机器有异味，机身底部有水渍。用户称只是擦拭外壳，不认可人为损坏判断。',
    purchasedAt: '2025-07-22T08:00:00.000Z',
    createdAt: '2026-05-20T06:35:00.000Z',
    slaDueAt: '2026-05-20T14:35:00.000Z',
    status: 'escalated',
    estimatedManualMinutes: 38,
    aiAssistedMinutes: 16,
    tags: ['进水风险', '争议', '主管复核'],
    transcript: [
      { speaker: 'customer', at: '2026-05-20T06:35:00.000Z', text: '只是擦了一下外壳，不可能进水。' },
      { speaker: 'agent', at: '2026-05-20T06:42:00.000Z', text: '门店检测照片显示底部有明显水渍，需要主管复核。' }
    ]
  }
]

const recommendations: AgentRecommendation[] = [
  {
    id: 'rec-tkt-24003',
    ticketId: 'tkt-24003',
    conclusion: '已过整机 24 个月质保，建议先远程完成固件升级和地图重建；若仍复现，按付费检修报价。',
    confidence: 0.78,
    warrantyStatus: 'expired',
    evidence: [
      { docId: 'doc-vac-map', title: 'SB-MAX 地图漂移处理流程', quote: '地图漂移优先检查固件版本、充电座位置和激光雷达遮挡。' }
    ],
    suggestedActions: ['发送固件升级指引', '预约远程指导', '复现后创建付费检修单'],
    riskFlags: ['过保说明需要清晰留痕'],
    nextBestAction: 'escalate',
    trace: [
      { step: '读取订单', detail: '购买日期 2023-08-09，超过 24 个月质保窗口。', durationMs: 64 },
      { step: '检索知识库', detail: '命中地图漂移处理流程和维修规则。', durationMs: 117 },
      { step: '生成建议', detail: '先远程排查，再进入付费检修。', durationMs: 246 }
    ],
    createdAt: '2026-05-21T09:18:00.000Z'
  }
]

const actionDrafts: ActionDraft[] = []

const store: ServiceOpsStore = {
  customers,
  products,
  policies,
  knowledgeDocs,
  tickets,
  recommendations,
  actionDrafts
}

export function getStore() {
  return store
}
