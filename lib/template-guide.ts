// Shared HTML DOM contract consumed by bojian-mobile/assets/templates/market_renderer.js.
export const basicTemplateFields = [
  ["name", "姓名", "林晓（示例）"],
  ["phone", "联系电话", "用户填写的电话号码"],
  ["email", "电子邮箱", "name@example.com"],
  ["birth_date", "出生日期", "用户资料中的出生日期显示文字"],
  ["gender", "性别", "用户填写的性别"],
  ["position", "期望岗位", "产品经理"],
  ["city", "期望城市", "上海"],
  ["industry", "期望行业", "互联网"],
  ["salary", "期望薪资", "18–25K"],
  ["preference", "求职偏好", "用户填写的求职偏好正文"],
] as const;

export const templateCollections = [
  ["educations", "教育经历", "学校、学历、专业、在校经历与论文说明"],
  ["work_experiences", "工作经历", "公司、岗位、行业与工作描述"],
  ["projects", "项目经历", "项目名、角色、链接、项目描述与成果"],
  ["certifications", "证书与荣誉", "证书名、颁发机构；其他字段按实际资料显示"],
  ["skills", "专业技能", "使用 name 表示技能名称，detail 表示技能描述"],
] as const;

export const templateItemFields = [
  ["title", "条目名称", "学校 / 公司 / 项目 / 证书名称"],
  ["subtitle", "副标题", "学历 / 岗位 / 项目角色 / 颁发机构"],
  ["auxiliary", "补充信息", "专业 / 行业 / 项目链接等"],
  ["start_date", "开始日期", "当前条目的开始时间"],
  ["end_date", "结束日期", "当前条目的结束时间；未结束的经历可显示“至今”"],
  ["detail", "主要描述", "在校经历 / 工作描述 / 项目描述 / 技能描述"],
  ["secondary_detail", "补充描述", "论文说明 / 项目成果等；没有内容时为空"],
  ["name", "技能名称", "在 skills 循环中使用；循环内不再表示本人姓名"],
] as const;

export const guideExamples = {
  basic:
    "<h1>{{name}}</h1>\n<p>{{position}}</p>\n<p>{{#if phone}}电话：{{phone}}{{/if}}</p>",
  experience:
    "<h2>工作经历</h2>\n<p>{{#work_experiences}}</p>\n<div>\n  <h3>{{title}}{{#if subtitle}} · {{subtitle}}{{/if}}</h3>\n  <p>{{start_date}}{{#if end_date}} — {{end_date}}{{/if}}</p>\n  <p>{{detail}}</p>\n</div>\n<p>{{/work_experiences}}</p>",
  skills:
    "<p>{{#skills}}</p>\n<p>{{name}}{{#if detail}}：{{detail}}{{/if}}</p>\n<p>{{/skills}}</p>",
  inline: "<p>{{#if phone}}电话：{{phone}}{{/if}}</p>",
  block:
    "<p>{{#if preference}}</p>\n<h2>个人简介</h2>\n<p>{{preference}}</p>\n<p>{{/if}}</p>",
} as const;
