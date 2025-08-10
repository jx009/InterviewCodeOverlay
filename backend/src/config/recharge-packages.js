// 充值套餐配置
const rechargePackages = [
  {
    id: 999,
    name: "测试套餐",
    description: "仅供测试使用，1分钱体验充值功能",
    amount: 0.01,
    points: 1000,
    bonusPoints: 0,
    isActive: true,
    isRecommended: false,
    sortOrder: 0,
    icon: "🧪",
    label: "test",
    labelColor: "gray"
  },
  {
    id: 1,
    name: "体验套餐",
    description: "适合新用户体验AI功能",
    amount: 9.90,
    points: 100,
    bonusPoints: 10,
    isActive: true,
    isRecommended: false,
    sortOrder: 1,
    icon: "🌟",
    label: "new_user",
    labelColor: "blue"
  },
  {
    id: 2,
    name: "标准套餐",
    description: "日常使用，性价比最高",
    amount: 29.90,
    points: 300,
    bonusPoints: 50,
    isActive: true,
    isRecommended: true,
    sortOrder: 2,
    icon: "💎",
    label: "package", labelColor: "blue"
  },
  {
    id: 3,
    name: "专业套餐",
    description: "适合重度用户，功能全面",
    amount: 58.00,
    points: 600,
    bonusPoints: 120,
    isActive: true,
    isRecommended: false,
    sortOrder: 3,
    icon: "👑",
    label: "package", labelColor: "blue"
  },
  {
    id: 4,
    name: "企业套餐",
    description: "团队使用，积分充足",
    amount: 99.00,
    points: 1000,
    bonusPoints: 250,
    isActive: true,
    isRecommended: false,
    sortOrder: 4,
    icon: "🏢",
    label: "package", labelColor: "blue"
  },
  {
    id: 5,
    name: "VIP套餐",
    description: "超值大容量，长期使用",
    amount: 188.00,
    points: 2000,
    bonusPoints: 600,
    isActive: true,
    isRecommended: false,
    sortOrder: 5,
    icon: "💰",
    label: "package", labelColor: "blue"
  }
];

// 获取所有可用套餐
function getAvailablePackages() {
  return rechargePackages.filter(pkg => pkg.isActive);
}

// 根据ID获取套餐
function getPackageById(id) {
  return rechargePackages.find(pkg => pkg.id === parseInt(id) && pkg.isActive);
}

// 获取推荐套餐
function getRecommendedPackages() {
  return rechargePackages.filter(pkg => pkg.isActive && pkg.isRecommended);
}

// 计算套餐总积分
function getTotalPoints(packageId) {
  const pkg = getPackageById(packageId);
  if (!pkg) return 0;
  return pkg.points + pkg.bonusPoints;
}

module.exports = {
  rechargePackages,
  getAvailablePackages,
  getPackageById,
  getRecommendedPackages,
  getTotalPoints
};