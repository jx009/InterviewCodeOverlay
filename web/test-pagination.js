// 测试分页逻辑
function testPaginationLogic(totalPages) {
  const items = [];
  
  if (totalPages <= 3) {
    // 3页以内，显示所有页码
    for (let i = 1; i <= totalPages; i++) {
      items.push(i);
    }
  } else {
    // 超过3页，显示1、2、3...最后一页的模式
    // 始终显示第1、2、3页
    for (let i = 1; i <= 3; i++) {
      items.push(i);
    }

    // 如果最后一页不是第4页，显示省略号
    if (totalPages > 4) {
      items.push('...');
    }

    // 显示最后一页（如果不是第3页或第4页）
    if (totalPages > 3) {
      items.push(totalPages);
    }
  }

  return items;
}

// 测试不同的页数
console.log('1页:', testPaginationLogic(1)); // 应该显示: [1]
console.log('2页:', testPaginationLogic(2)); // 应该显示: [1, 2]
console.log('3页:', testPaginationLogic(3)); // 应该显示: [1, 2, 3]
console.log('4页:', testPaginationLogic(4)); // 应该显示: [1, 2, 3, 4]
console.log('5页:', testPaginationLogic(5)); // 应该显示: [1, 2, 3, 5]
console.log('10页:', testPaginationLogic(10)); // 应该显示: [1, 2, 3, '...', 10]