/**
 * 股票代码名称映射
 * 中国 A 股股票代码与名称对照表
 */

export interface StockInfo {
  code: string;
  name: string;
  market: 'SH' | 'SZ' | 'BJ';
}

/** 股票代码名称映射表 */
export const STOCK_NAMES: Record<string, StockInfo> = {
  // 银行
  '600000': { code: '600000', name: '浦发银行', market: 'SH' },
  '600015': { code: '600015', name: '华夏银行', market: 'SH' },
  '600016': { code: '600016', name: '民生银行', market: 'SH' },
  '600036': { code: '600036', name: '招商银行', market: 'SH' },
  '601009': { code: '601009', name: '南京银行', market: 'SH' },
  '601166': { code: '601166', name: '兴业银行', market: 'SH' },
  '601169': { code: '601169', name: '北京银行', market: 'SH' },
  '601229': { code: '601229', name: '上海银行', market: 'SH' },
  '601288': { code: '601288', name: '农业银行', market: 'SH' },
  '601328': { code: '601328', name: '交通银行', market: 'SH' },
  '601398': { code: '601398', name: '工商银行', market: 'SH' },
  '601658': { code: '601658', name: '中国银行', market: 'SH' },
  '601818': { code: '601818', name: '光大银行', market: 'SH' },
  '601939': { code: '601939', name: '建设银行', market: 'SH' },
  '601988': { code: '601988', name: '工商银行', market: 'SH' },
  '000001': { code: '000001', name: '平安银行', market: 'SZ' },
  '002142': { code: '002142', name: '宁波银行', market: 'SZ' },
  '002807': { code: '002807', name: '江阴银行', market: 'SZ' },
  '002936': { code: '002936', name: '郑州银行', market: 'SZ' },
  '002948': { code: '002948', name: '青岛银行', market: 'SZ' },

  // 证券
  '600030': { code: '600030', name: '中信证券', market: 'SH' },
  '600109': { code: '600109', name: '国金证券', market: 'SH' },
  '600837': { code: '600837', name: '海通证券', market: 'SH' },
  '600999': { code: '600999', name: '招商证券', market: 'SH' },
  '601066': { code: '601066', name: '中信建投', market: 'SH' },
  '601108': { code: '601108', name: '财通证券', market: 'SH' },
  '601211': { code: '601211', name: '国泰君安', market: 'SH' },
  '601377': { code: '601377', name: '兴业证券', market: 'SH' },
  '601688': { code: '601688', name: '华泰证券', market: 'SH' },
  '601788': { code: '601788', name: '光大证券', market: 'SH' },
  '601878': { code: '601878', name: '浙商证券', market: 'SH' },
  '000166': { code: '000166', name: '申万宏源', market: 'SZ' },
  '000686': { code: '000686', name: '东北证券', market: 'SZ' },
  '000728': { code: '000728', name: '国元证券', market: 'SZ' },
  '000750': { code: '000750', name: '国海证券', market: 'SZ' },
  '000776': { code: '000776', name: '广发证券', market: 'SZ' },
  '000783': { code: '000783', name: '长江证券', market: 'SZ' },
  '002673': { code: '002673', name: '西部证券', market: 'SZ' },
  '002736': { code: '002736', name: '国信证券', market: 'SZ' },
  '002797': { code: '002797', name: '第一创业', market: 'SZ' },
  '002926': { code: '002926', name: '华西证券', market: 'SZ' },
  '002939': { code: '002939', name: '长城证券', market: 'SZ' },

  // 保险
  '601318': { code: '601318', name: '中国平安', market: 'SH' },
  '601601': { code: '601601', name: '中国太保', market: 'SH' },
  '601628': { code: '601628', name: '中国人寿', market: 'SH' },
  '000996': { code: '000996', name: '中国中免', market: 'SZ' },

  // 房地产
  '000002': { code: '000002', name: '万科 A', market: 'SZ' },
  '000069': { code: '000069', name: '华侨城 A', market: 'SZ' },
  '000402': { code: '000402', name: '金融街', market: 'SZ' },
  '001979': { code: '001979', name: '招商蛇口', market: 'SZ' },
  '600007': { code: '600007', name: '中国国贸', market: 'SH' },
  '600048': { code: '600048', name: '保利发展', market: 'SH' },
  '600153': { code: '600153', name: '建发股份', market: 'SH' },
  '600325': { code: '600325', name: '华发股份', market: 'SH' },
  '600340': { code: '600340', name: '华夏幸福', market: 'SH' },
  '600383': { code: '600383', name: '金地集团', market: 'SH' },
  '600606': { code: '600606', name: '绿地控股', market: 'SH' },
  '601155': { code: '601155', name: '新城控股', market: 'SH' },

  // 科技
  '000063': { code: '000063', name: '中兴通讯', market: 'SZ' },
  '000100': { code: '000100', name: 'TCL 科技', market: 'SZ' },
  '000725': { code: '000725', name: '京东方 A', market: 'SZ' },
  '000977': { code: '000977', name: '浪潮信息', market: 'SZ' },
  '002049': { code: '002049', name: '紫光国微', market: 'SZ' },
  '002230': { code: '002230', name: '科大讯飞', market: 'SZ' },
  '002415': { code: '002415', name: '海康威视', market: 'SZ' },
  '002916': { code: '002916', name: '深南电路', market: 'SZ' },
  '300014': { code: '300014', name: '亿纬锂能', market: 'SZ' },
  '300059': { code: '300059', name: '东方财富', market: 'SZ' },
  '300124': { code: '300124', name: '汇川技术', market: 'SZ' },
  '300750': { code: '300750', name: '宁德时代', market: 'SZ' },
  '600183': { code: '600183', name: '生益科技', market: 'SH' },
  '600498': { code: '600498', name: '烽火通信', market: 'SH' },
  '600570': { code: '600570', name: '恒生电子', market: 'SH' },
  '600584': { code: '600584', name: '长电科技', market: 'SH' },
  '600745': { code: '600745', name: '闻泰科技', market: 'SH' },
  '601138': { code: '601138', name: '工业富联', market: 'SH' },
  '688012': { code: '688012', name: '中微公司', market: 'SH' },
  '688981': { code: '688981', name: '中芯国际', market: 'SH' },

  // 消费
  '000333': { code: '000333', name: '美的集团', market: 'SZ' },
  '000568': { code: '000568', name: '泸州老窖', market: 'SZ' },
  '000651': { code: '000651', name: '格力电器', market: 'SZ' },
  '000799': { code: '000799', name: '酒鬼酒', market: 'SZ' },
  '000858': { code: '000858', name: '五粮液', market: 'SZ' },
  '000895': { code: '000895', name: '双汇发展', market: 'SZ' },
  '002304': { code: '002304', name: '洋河股份', market: 'SZ' },
  '002507': { code: '002507', name: '涪陵榨菜', market: 'SZ' },
  '002557': { code: '002557', name: '洽洽食品', market: 'SZ' },
  '002739': { code: '002739', name: '万达电影', market: 'SZ' },
  '600138': { code: '600138', name: '中青旅', market: 'SH' },
  '600519': { code: '600519', name: '贵州茅台', market: 'SH' },
  '600597': { code: '600597', name: '光明乳业', market: 'SH' },
  '600690': { code: '600690', name: '海尔智家', market: 'SH' },
  '600887': { code: '600887', name: '伊利股份', market: 'SH' },
  '601888': { code: '601888', name: '中国中免', market: 'SH' },
  '603198': { code: '603198', name: '迎驾贡酒', market: 'SH' },
  '603288': { code: '603288', name: '海天味业', market: 'SH' },

  // 医药
  '000423': { code: '000423', name: '东阿阿胶', market: 'SZ' },
  '000513': { code: '000513', name: '丽珠集团', market: 'SZ' },
  '000538': { code: '000538', name: '云南白药', market: 'SZ' },
  '000661': { code: '000661', name: '长春高新', market: 'SZ' },
  '000963': { code: '000963', name: '华东医药', market: 'SZ' },
  '002007': { code: '002007', name: '华兰生物', market: 'SZ' },
  '002603': { code: '002603', name: '以岭药业', market: 'SZ' },
  '300003': { code: '300003', name: '乐普医疗', market: 'SZ' },
  '300015': { code: '300015', name: '爱尔眼科', market: 'SZ' },
  '300122': { code: '300122', name: '智飞生物', market: 'SZ' },
  '300142': { code: '300142', name: '沃森生物', market: 'SZ' },
  '300601': { code: '300601', name: '康泰生物', market: 'SZ' },
  '600079': { code: '600079', name: '人福医药', market: 'SH' },
  '600085': { code: '600085', name: '同仁堂', market: 'SH' },
  '600161': { code: '600161', name: '天坛生物', market: 'SH' },
  '600196': { code: '600196', name: '复星医药', market: 'SH' },
  '600276': { code: '600276', name: '恒瑞医药', market: 'SH' },
  '600332': { code: '600332', name: '白云山', market: 'SH' },
  '600436': { code: '600436', name: '片仔癀', market: 'SH' },
  '600511': { code: '600511', name: '国药股份', market: 'SH' },
  '601607': { code: '601607', name: '上海医药', market: 'SH' },
  '603259': { code: '603259', name: '药明康德', market: 'SH' },

  // 制造/其他
  '000157': { code: '000157', name: '中联重科', market: 'SZ' },
  '000425': { code: '000425', name: '徐工机械', market: 'SZ' },
  '000528': { code: '000528', name: '柳工', market: 'SZ' },
  '000625': { code: '000625', name: '长安汽车', market: 'SZ' },
  '000951': { code: '000951', name: '中国重汽', market: 'SZ' },
  '002048': { code: '002048', name: '宁波华翔', market: 'SZ' },
  '002050': { code: '002050', name: '三花智控', market: 'SZ' },
  '002074': { code: '002074', name: '国轩高科', market: 'SZ' },
  '002179': { code: '002179', name: '中航光电', market: 'SZ' },
  '002202': { code: '002202', name: '金风科技', market: 'SZ' },
  '600006': { code: '600006', name: '东风汽车', market: 'SH' },
  '600019': { code: '600019', name: '宝钢股份', market: 'SH' },
  '600031': { code: '600031', name: '三一重工', market: 'SH' },
  '600038': { code: '600038', name: '中直股份', market: 'SH' },
  '600062': { code: '600062', name: '华润双鹤', market: 'SH' },
  '600066': { code: '600066', name: '宇通客车', market: 'SH' },
  '600104': { code: '600104', name: '上汽集团', market: 'SH' },
  '600150': { code: '600150', name: '中国船舶', market: 'SH' },
  '600169': { code: '600169', name: '太原重工', market: 'SH' },
  '600206': { code: '600206', name: '有研新材', market: 'SH' },
  '600219': { code: '600219', name: '南山铝业', market: 'SH' },
  '600309': { code: '600309', name: '万华化学', market: 'SH' },
  '600316': { code: '600316', name: '洪都航空', market: 'SH' },
  '600320': { code: '600320', name: '振华重工', market: 'SH' },
  '600346': { code: '600346', name: '恒力石化', market: 'SH' },
  '600362': { code: '600362', name: '江西铜业', market: 'SH' },
  '600372': { code: '600372', name: '中航电子', market: 'SH' },
  '600392': { code: '600392', name: '盛和资源', market: 'SH' },
  '600399': { code: '600399', name: '抚顺特钢', market: 'SH' },
  '600406': { code: '600406', name: '国电南瑞', market: 'SH' },
  '600418': { code: '600418', name: '江淮汽车', market: 'SH' },
  '600426': { code: '600426', name: '华鲁恒升', market: 'SH' },
  '600435': { code: '600435', name: '北方导航', market: 'SH' },
  '600456': { code: '600456', name: '宝钛股份', market: 'SH' },
  '600458': { code: '600458', name: '时代新材', market: 'SH' },
  '600460': { code: '600460', name: '士兰微', market: 'SH' },
  '600472': { code: '600472', name: '包钢股份', market: 'SH' },
  '600482': { code: '600482', name: '中国动力', market: 'SH' },
  '600487': { code: '600487', name: '亨通光电', market: 'SH' },
  '600489': { code: '600489', name: '中金黄金', market: 'SH' },
  '600497': { code: '600497', name: '驰宏锌锗', market: 'SH' },
  '600507': { code: '600507', name: '方大特钢', market: 'SH' },
  '600516': { code: '600516', name: '方大炭素', market: 'SH' },
  '600522': { code: '600522', name: '中天科技', market: 'SH' },
  '600528': { code: '600528', name: '中铁工业', market: 'SH' },
  '600547': { code: '600547', name: '山东黄金', market: 'SH' },
  '600549': { code: '600549', name: '厦门钨业', market: 'SH' },
  '600550': { code: '600550', name: '保变电气', market: 'SH' },
  '600563': { code: '600563', name: '法拉电子', market: 'SH' },
  '600575': { code: '600575', name: '淮河能源', market: 'SH' },
  '600580': { code: '600580', name: '卧龙电驱', market: 'SH' },
  '600581': { code: '600581', name: '钢研高纳', market: 'SH' },
  '600582': { code: '600582', name: '天地科技', market: 'SH' },
  '600583': { code: '600583', name: '海油工程', market: 'SH' },
  '600585': { code: '600585', name: '海螺水泥', market: 'SH' },
  '600588': { code: '600588', name: '用友网络', market: 'SH' },
  '600591': { code: '600591', name: '吉祥航空', market: 'SH' },
  '600600': { code: '600600', name: '青岛啤酒', market: 'SH' },
  '600660': { code: '600660', name: '福耀玻璃', market: 'SH' },
  '600674': { code: '600674', name: '川投能源', market: 'SH' },
  '600685': { code: '600685', name: '中船防务', market: 'SH' },
  '600686': { code: '600686', name: '金龙汽车', market: 'SH' },
  '600688': { code: '600688', name: '上海石化', market: 'SH' },
  '600699': { code: '600699', name: '均胜电子', market: 'SH' },
  '600703': { code: '600703', name: '三安光电', market: 'SH' },
  '600704': { code: '600704', name: '物产中大', market: 'SH' },
  '600741': { code: '600741', name: '华域汽车', market: 'SH' },
  '600742': { code: '600742', name: '一汽富维', market: 'SH' },
  '600760': { code: '600760', name: '中航沈飞', market: 'SH' },
  '600761': { code: '600761', name: '安徽合力', market: 'SH' },
  '600763': { code: '600763', name: '通策医疗', market: 'SH' },
  '600764': { code: '600764', name: '中国海防', market: 'SH' },
  '600765': { code: '600765', name: '中航重机', market: 'SH' },
  '600808': { code: '600808', name: '马钢股份', market: 'SH' },
  '600845': { code: '600845', name: '宝信软件', market: 'SH' },
  '600850': { code: '600850', name: '电科数字', market: 'SH' },
  '600862': { code: '600862', name: '中航高科', market: 'SH' },
  '600875': { code: '600875', name: '东方电气', market: 'SH' },
  '600879': { code: '600879', name: '航天电子', market: 'SH' },
  '600884': { code: '600884', name: '杉杉股份', market: 'SH' },
  '600885': { code: '600885', name: '宏发股份', market: 'SH' },
  '600893': { code: '600893', name: '航发动力', market: 'SH' },
  '600900': { code: '600900', name: '长江电力', market: 'SH' },
  '600970': { code: '600970', name: '中材国际', market: 'SH' },
  '601012': { code: '601012', name: '隆基绿能', market: 'SH' },
  '601038': { code: '601038', name: '一拖股份', market: 'SH' },
  '601058': { code: '601058', name: '赛轮轮胎', market: 'SH' },
  '601100': { code: '601100', name: '恒立液压', market: 'SH' },
  '601127': { code: '601127', name: '赛力斯', market: 'SH' },
  '601137': { code: '601137', name: '博威合金', market: 'SH' },
  '601163': { code: '601163', name: '三角轮胎', market: 'SH' },
  '601179': { code: '601179', name: '中国西电', market: 'SH' },
  '601208': { code: '601208', name: '东材科技', market: 'SH' },
  '601233': { code: '601233', name: '桐昆股份', market: 'SH' },
  '601238': { code: '601238', name: '广汽集团', market: 'SH' },
  '601311': { code: '601311', name: '骆驼股份', market: 'SH' },
  '601360': { code: '601360', name: '三六零', market: 'SH' },
  '601515': { code: '601515', name: '东风股份', market: 'SH' },
  '601566': { code: '601566', name: '九牧王', market: 'SH' },
  '601600': { code: '601600', name: '中国铝业', market: 'SH' },
  '601606': { code: '601606', name: '长城军工', market: 'SH' },
  '601608': { code: '601608', name: '中信重工', market: 'SH' },
  '601609': { code: '601609', name: '金田股份', market: 'SH' },
  '601611': { code: '601611', name: '中国核建', market: 'SH' },
  '601615': { code: '601615', name: '明阳智能', market: 'SH' },
  '601618': { code: '601618', name: '中国中冶', market: 'SH' },
  '601619': { code: '601619', name: '嘉泽新能', market: 'SH' },
  '601633': { code: '601633', name: '长城汽车', market: 'SH' },
  '601668': { code: '601668', name: '中国建筑', market: 'SH' },
  '601669': { code: '601669', name: '中国电建', market: 'SH' },
  '601677': { code: '601677', name: '明泰铝业', market: 'SH' },
  '601689': { code: '601689', name: '拓普集团', market: 'SH' },
  '601698': { code: '601698', name: '中国卫通', market: 'SH' },
  '601717': { code: '601717', name: '郑煤机', market: 'SH' },
  '601727': { code: '601727', name: '上海电气', market: 'SH' },
  '601777': { code: '601777', name: '力帆科技', market: 'SH' },
  '601799': { code: '601799', name: '星宇股份', market: 'SH' },
  '601800': { code: '601800', name: '中国交建', market: 'SH' },
  '601808': { code: '601808', name: '中海油服', market: 'SH' },
  '601828': { code: '601828', name: '美凯龙', market: 'SH' },
  '601857': { code: '601857', name: '中国石油', market: 'SH' },
  '601865': { code: '601865', name: '福莱特', market: 'SH' },
  '601866': { code: '601866', name: '中远海发', market: 'SH' },
  '601868': { code: '601868', name: '中国能建', market: 'SH' },
  '601877': { code: '601877', name: '浙江自然', market: 'SH' },
  '601880': { code: '601880', name: '大连港', market: 'SH' },
  '601882': { code: '601882', name: '海天精工', market: 'SH' },
  '601890': { code: '601890', name: '泰尔股份', market: 'SH' },
  '601898': { code: '601898', name: '中煤能源', market: 'SH' },
  '601899': { code: '601899', name: '紫金矿业', market: 'SH' },
  '601901': { code: '601901', name: '方正证券', market: 'SH' },
  '601919': { code: '601919', name: '中远海控', market: 'SH' },
  '601928': { code: '601928', name: '凤凰传媒', market: 'SH' },
  '601952': { code: '601952', name: '苏垦农发', market: 'SH' },
  '601958': { code: '601958', name: '金钼股份', market: 'SH' },
  '601965': { code: '601965', name: '中国汽研', market: 'SH' },
  '601966': { code: '601966', name: '玲珑轮胎', market: 'SH' },
  '601968': { code: '601968', name: '宝钢包装', market: 'SH' },
  '601975': { code: '601975', name: '招商南油', market: 'SH' },
  '601985': { code: '601985', name: '中国核电', market: 'SH' },
  '601989': { code: '601989', name: '中国重工', market: 'SH' },
  '601991': { code: '601991', name: '大唐发电', market: 'SH' },
  '601992': { code: '601992', name: '金隅集团', market: 'SH' },

  // 其他常见股票
  '600718': { code: '600718', name: '东软集团', market: 'SH' },
  '002065': { code: '002065', name: '东华软件', market: 'SZ' },
};

/**
 * 获取股票名称
 * @param symbol 股票代码
 * @returns 股票名称，如果找不到则返回 undefined
 */
export function getStockName(symbol: string): string | undefined {
  return STOCK_NAMES[symbol]?.name;
}

/**
 * 获取股票名称或返回代码
 * @param symbol 股票代码
 * @returns 股票名称，如果找不到则返回股票代码
 */
export function getStockNameOrDefault(symbol: string): string {
  return STOCK_NAMES[symbol]?.name || symbol;
}

/**
 * 获取股票信息
 * @param symbol 股票代码
 * @returns 股票信息，如果找不到则返回 undefined
 */
export function getStockInfo(symbol: string): StockInfo | undefined {
  return STOCK_NAMES[symbol];
}

/**
 * 格式化股票显示名称（代码 + 名称）
 * @param symbol 股票代码
 * @returns 格式化后的显示名称，如 "600036 招商银行"
 */
export function formatStockName(symbol: string): string {
  const name = getStockName(symbol);
  if (name === symbol) return symbol;
  return `${symbol} ${name}`;
}
