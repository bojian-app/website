// The resume sections both public resume pages lay out, in order, with the
// fields each one shows.
export const expectationIcons = {
  city: "M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Zm-5 0a2 2 0 1 0-4 0 2 2 0 0 0 4 0Z",
  industry:
    "M8 7V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M3 8h18v12H3Zm0 5c5 2 13 2 18 0M12 13v3",
  salary: "M3 6h18v12H3Zm6 2 3 4 3-4m-6 4h6m-6 2h6m-3-2v4",
} as const;
export const expectationDetails = ["city", "industry", "salary"] as const;
export const resumeSections = [
  [
    "job_expectation",
    "求职意向",
    ["position", ...expectationDetails, "preference"],
  ],
  [
    "work_experiences",
    "工作经历",
    ["position", "industry", "start_date", "end_date", "description"],
  ],
  [
    "projects",
    "项目经历",
    ["name", "role", "start_date", "end_date", "description", "achievements"],
  ],
  [
    "educations",
    "教育经历",
    [
      "degree",
      "field_of_study",
      "start_date",
      "end_date",
      "campus_experience",
      "thesis_title",
      "thesis_description",
    ],
  ],
  ["skills", "专业技能", ["name", "description"]],
  ["certifications", "证书荣誉", ["name", "date"]],
] as const;
