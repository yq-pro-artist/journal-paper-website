// 测试评分计算逻辑
const RATINGS = [
  { key: 'h', label: '夯',    points: 5 },
  { key: 'd', label: '顶级',  points: 4 },
  { key: 'r', label: '人上人',points: 3 },
  { key: 'n', label: 'NPC',   points: 2 },
  { key: 'l', label: '拉完了',points: 1 },
]

function calcScore(votes) {
  let ws = 0, total = 0
  RATINGS.forEach(r => {
    const c = votes?.[r.key] || 0
    ws += r.points * c
    total += c
  })
  return total === 0 ? { score: 0, total } : { score: Math.round(ws / total * 10) / 10, total }
}

describe('评分计算', () => {
  test('没有投票时分数为0', () => {
    expect(calcScore({}).score).toBe(0)
  })

  test('全部夯(5分)时均分为5', () => {
    const result = calcScore({ h: 10 })
    expect(result.score).toBe(5)
    expect(result.total).toBe(10)
  })

  test('全部拉完了(1分)时均分为1', () => {
    const result = calcScore({ l: 5 })
    expect(result.score).toBe(1)
  })

  test('混合投票正确计算加权平均', () => {
    // 1个夯(5分) + 1个拉完了(1分) = (5+1)/2 = 3.0
    const result = calcScore({ h: 1, l: 1 })
    expect(result.score).toBe(3)
    expect(result.total).toBe(2)
  })

  test('undefined投票不报错', () => {
    expect(() => calcScore(undefined)).not.toThrow()
    expect(calcScore(undefined).score).toBe(0)
  })

  test('分数精确到小数点后一位', () => {
    // 2个夯(5) + 1个NPC(2) = (10+2)/3 = 4.0
    const result = calcScore({ h: 2, n: 1 })
    expect(result.score).toBe(4)
  })
})

describe('日期判断', () => {
  test('今天的日期返回true', () => {
    const now = new Date()
    function isToday(dateStr) {
      const d = new Date(dateStr)
      return d.getFullYear() === now.getFullYear() &&
             d.getMonth() === now.getMonth() &&
             d.getDate() === now.getDate()
    }
    expect(isToday(now.toISOString())).toBe(true)
  })

  test('昨天的日期返回false', () => {
    const now = new Date()
    function isToday(dateStr) {
      const d = new Date(dateStr)
      return d.getFullYear() === now.getFullYear() &&
             d.getMonth() === now.getMonth() &&
             d.getDate() === now.getDate()
    }
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    expect(isToday(yesterday.toISOString())).toBe(false)
  })
})
