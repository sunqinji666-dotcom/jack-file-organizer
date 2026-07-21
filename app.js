const persona = {
  name: "Jack",
  role: "本地优先的文件整理助手",
  highlights: [
    "先看结构，再看细节：不要堆信息，先把文件分门别类。",
    "要说人话：命名要清楚，交付要体面，别做 PPT 式混乱。",
    "执行优先：优先找出客户交付、正在推进、会影响收入的文件。",
    "风格克制但高级：保留审美，减少噪音，删掉没用的东西。",
    "工具只是工具：最后要落到今天能不能整理完。",
  ],
};

const categoryRules = [
  {
    id: "delivery",
    label: "客户交付",
    folder: "01_客户交付",
    weight: 100,
    match(file) {
      return hasAny(file, [
        "合同",
        "报价",
        "交付",
        "验收",
        "方案",
        "回款",
        "客户",
        "甲方",
        "银行",
        "政府",
        "企业",
        "项目",
        "宣传片",
        "提案",
      ]);
    },
  },
  {
    id: "creative",
    label: "创作策划",
    folder: "02_创作策划",
    weight: 90,
    match(file) {
      return hasAny(file, [
        "脚本",
        "分镜",
        "导演",
        "拍摄",
        "剪辑",
        "文案",
        "旁白",
        "口播",
        "镜头",
        "故事",
        "创意",
        "策划",
      ]);
    },
  },
  {
    id: "knowledge",
    label: "知识库",
    folder: "03_知识库",
    weight: 80,
    match(file) {
      return hasAny(file, [
        "知识库",
        "转录",
        "语料",
        "索引",
        "人设",
        "指南",
        "总结",
        "提炼",
        "笔记",
        "课程",
        "资料",
      ]);
    },
  },
  {
    id: "asset",
    label: "素材",
    folder: "04_素材",
    weight: 70,
    match(file) {
      return [
        "image/",
        "video/",
      ].some((prefix) => file.type.startsWith(prefix)) || hasAny(file, ["素材", "截图", "封面", "原片", "照片", "图片", "视频"]);
    },
  },
  {
    id: "personal",
    label: "个人文档",
    folder: "05_个人",
    weight: 60,
    match(file) {
      return hasAny(file, [
        "日记",
        "计划",
        "自我",
        "人生",
        "人设",
        "成长",
        "复盘",
        "目标",
        "心情",
      ]);
    },
  },
];

const genericRules = [
  { token: "视频", folder: "02_创作策划", label: "创作策划" },
  { token: "剪辑", folder: "02_创作策划", label: "创作策划" },
  { token: "文案", folder: "02_创作策划", label: "创作策划" },
  { token: "人设", folder: "03_知识库", label: "知识库" },
  { token: "转录", folder: "03_知识库", label: "知识库" },
  { token: "素材", folder: "04_素材", label: "素材" },
  { token: "照片", folder: "04_素材", label: "素材" },
  { token: "图片", folder: "04_素材", label: "素材" },
  { token: "合同", folder: "01_客户交付", label: "客户交付" },
  { token: "报价", folder: "01_客户交付", label: "客户交付" },
];

const state = {
  files: [],
  selectedId: null,
  query: "",
  view: "all",
};

const els = {
  fileInput: document.getElementById("fileInput"),
  dropZone: document.getElementById("dropZone"),
  fileList: document.getElementById("fileList"),
  searchInput: document.getElementById("searchInput"),
  viewSelect: document.getElementById("viewSelect"),
  exportBtn: document.getElementById("exportBtn"),
  clearBtn: document.getElementById("clearBtn"),
  statusPill: document.getElementById("statusPill"),
  totalFiles: document.getElementById("totalFiles"),
  textFiles: document.getElementById("textFiles"),
  highPriority: document.getElementById("highPriority"),
  needsReview: document.getElementById("needsReview"),
  personaHighlights: document.getElementById("personaHighlights"),
  detailEmpty: document.getElementById("detailEmpty"),
  detailView: document.getElementById("detailView"),
  detailName: document.getElementById("detailName"),
  detailMeta: document.getElementById("detailMeta"),
  detailFolder: document.getElementById("detailFolder"),
  detailRename: document.getElementById("detailRename"),
  detailReason: document.getElementById("detailReason"),
  detailTags: document.getElementById("detailTags"),
  template: document.getElementById("fileCardTemplate"),
};

persona.highlights.forEach((item) => {
  const li = document.createElement("li");
  li.textContent = item;
  els.personaHighlights.appendChild(li);
});

els.fileInput.addEventListener("change", async (event) => {
  await ingestFiles(Array.from(event.target.files || []));
});

els.dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  els.dropZone.classList.add("dragging");
});

els.dropZone.addEventListener("dragleave", () => {
  els.dropZone.classList.remove("dragging");
});

els.dropZone.addEventListener("drop", async (event) => {
  event.preventDefault();
  els.dropZone.classList.remove("dragging");
  await ingestFiles(Array.from(event.dataTransfer?.files || []));
});

els.searchInput.addEventListener("input", () => {
  state.query = els.searchInput.value.trim().toLowerCase();
  render();
});

els.viewSelect.addEventListener("change", () => {
  state.view = els.viewSelect.value;
  render();
});

els.exportBtn.addEventListener("click", () => {
  exportPlan();
});

els.clearBtn.addEventListener("click", () => {
  state.files = [];
  state.selectedId = null;
  render();
});

render();

async function ingestFiles(fileList) {
  if (!fileList.length) {
    return;
  }

  const accepted = [];
  for (const file of fileList) {
    accepted.push(await analyzeFile(file));
  }

  state.files = accepted.sort((a, b) => b.priority - a.priority || b.confidence - a.confidence || a.name.localeCompare(b.name, "zh-CN"));
  state.selectedId = state.files[0]?.id ?? null;
  render();
}

async function analyzeFile(file) {
  const text = await readTextIfUseful(file);
  const lowerName = file.name.toLowerCase();
  const lowerText = text.toLowerCase();
  const category = chooseCategory(file, lowerName, lowerText, text);
  const tags = collectTags(file, lowerName, lowerText, text, category);
  const priority = scorePriority(file, category, tags, lowerText, text);
  const confidence = scoreConfidence(file, category, text);
  const rename = suggestRename(file, category, tags);
  const reason = explainReason(file, category, tags, text, lowerText);

  return {
    id: crypto.randomUUID(),
    file,
    name: file.name,
    size: file.size,
    type: file.type || inferType(file.name),
    text,
    category,
    tags,
    priority,
    confidence,
    rename,
    reason,
    folder: category.folder,
    displaySize: formatBytes(file.size),
    shortMeta: buildShortMeta(file, category, priority, confidence),
  };
}

function chooseCategory(file, lowerName, lowerText, text) {
  let matched = categoryRules
    .map((rule) => ({ rule, matched: rule.match({ ...file, name: lowerName, text: lowerText }) }))
    .filter(({ matched }) => matched)
    .sort((a, b) => b.rule.weight - a.rule.weight);

  if (matched.length) {
    return matched[0].rule;
  }

  const extension = extOf(file.name);
  if (["jpg", "jpeg", "png", "webp", "gif", "heic", "mp4", "mov", "m4v", "avi", "mkv"].includes(extension)) {
    return categoryRules.find((item) => item.id === "asset");
  }

  if (text && text.trim().length > 0) {
    if (lowerText.includes("photo") || lowerText.includes("video") || lowerText.includes("拍摄")) {
      return categoryRules.find((item) => item.id === "creative");
    }
  }

  return {
    id: "misc",
    label: "杂项",
    folder: "90_待归档",
    weight: 10,
  };
}

function collectTags(file, lowerName, lowerText, text, category) {
  const raw = new Set();
  genericRules.forEach((rule) => {
    if (lowerName.includes(rule.token.toLowerCase()) || lowerText.includes(rule.token.toLowerCase())) {
      raw.add(rule.label);
    }
  });

  if (category?.label) {
    raw.add(category.label);
  }

  if (isTextFile(file)) {
    raw.add("文本");
  }
  if (isImageFile(file)) {
    raw.add("图片");
  }
  if (isVideoFile(file)) {
    raw.add("视频");
  }

  if (hasAny({ name: lowerName, text: lowerText }, ["计划", "清单", "list", "todo"])) {
    raw.add("清单");
  }
  if (hasAny({ name: lowerName, text: lowerText }, ["复盘", "总结", "review"])) {
    raw.add("复盘");
  }
  if (text && text.length > 0 && text.length > 1000) {
    raw.add("长文");
  }

  return Array.from(raw).slice(0, 6);
}

function scorePriority(file, category, tags, lowerText, text) {
  let score = 10;
  if (category?.id === "delivery") score += 45;
  if (category?.id === "creative") score += 28;
  if (category?.id === "knowledge") score += 22;
  if (isTextFile(file)) score += 12;
  if (tags.includes("清单") || tags.includes("复盘")) score += 12;
  if (text && text.length > 1800) score += 10;
  if (hasAny({ name: file.name.toLowerCase(), text: lowerText }, ["final", "定稿", "最终", "交付", "completed"])) score += 20;
  return Math.min(score, 100);
}

function scoreConfidence(file, category, text) {
  let score = 35;
  if (category?.id !== "misc") score += 25;
  if (text && text.length > 0) score += 20;
  if (category?.id === "delivery" || category?.id === "creative" || category?.id === "knowledge") score += 10;
  if (category?.id === "misc") score -= 12;
  return Math.max(18, Math.min(score, 96));
}

function suggestRename(file, category, tags) {
  const ext = extOf(file.name);
  const base = cleanBaseName(file.name);
  const prefix = {
    "客户交付": "交付",
    "创作策划": "创作",
    "知识库": "知识",
    "素材": "素材",
    "个人文档": "个人",
    "杂项": "待归档",
  }[category.label] || "整理";

  const tagBit = tags[0] ? `-${slugify(tags[0])}` : "";
  return `${prefix}-${base}${tagBit}${ext ? `.${ext}` : ""}`;
}

function explainReason(file, category, tags, text, lowerText) {
  const reasons = [];
  if (category?.label) {
    reasons.push(`文件名或内容更像「${category.label}」`);
  }
  if (tags.includes("文本")) {
    reasons.push("是可读文本，适合继续按内容拆分");
  }
  if (tags.includes("清单")) {
    reasons.push("看起来像清单或计划，优先级应往前提");
  }
  if (tags.includes("复盘")) {
    reasons.push("像复盘/总结类材料，适合归入知识库");
  }
  if (!reasons.length) {
    reasons.push("信息不够明确，先放到待归档，等你拍板");
  }
  if (text && text.length > 1200) {
    reasons.push("文本较长，建议保留原文件名的核心信息");
  }
  return reasons.join("；");
}

function buildShortMeta(file, category, priority, confidence) {
  const parts = [
    `${formatBytes(file.size)}`,
    `${priority} 分优先级`,
    `${confidence}% 置信度`,
  ];
  if (category?.label) {
    parts.unshift(category.label);
  }
  return parts.join(" · ");
}

async function readTextIfUseful(file) {
  if (!isTextFile(file)) {
    return "";
  }
  try {
    return await file.text();
  } catch {
    return "";
  }
}

function render() {
  updateStats();
  renderList();
  renderDetail();
  syncButtons();
}

function updateStats() {
  const filtered = filteredFiles();
  const textFiles = state.files.filter((item) => isTextFile(item.file)).length;
  const highPriority = state.files.filter((item) => item.priority >= 60).length;
  const needsReview = state.files.filter((item) => item.confidence < 55).length;

  els.totalFiles.textContent = state.files.length;
  els.textFiles.textContent = textFiles;
  els.highPriority.textContent = highPriority;
  els.needsReview.textContent = needsReview;

  if (!state.files.length) {
    els.statusPill.textContent = "等待导入";
  } else if (filtered.length === 0) {
    els.statusPill.textContent = "没有匹配结果";
  } else {
    els.statusPill.textContent = `${filtered.length} 个匹配结果`;
  }
}

function renderList() {
  const filtered = filteredFiles();
  els.fileList.innerHTML = "";

  if (!state.files.length) {
    els.fileList.classList.add("empty-state");
    els.fileList.textContent = "先导入文件。工具会按你的习惯，优先把“要交付的”挑出来。";
    return;
  }

  els.fileList.classList.remove("empty-state");

  if (!filtered.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "没有找到符合当前筛选的文件。";
    els.fileList.appendChild(empty);
    return;
  }

  filtered.forEach((item) => {
    const node = els.template.content.firstElementChild.cloneNode(true);
    const main = node.querySelector(".file-main");
    const name = node.querySelector(".file-name");
    const confidence = node.querySelector(".confidence");
    const subline = node.querySelector(".file-subline");
    const category = node.querySelector(".category-pill");
    const folder = node.querySelector(".folder-pill");

    name.textContent = item.name;
    confidence.textContent = `${item.confidence}%`;
    subline.textContent = item.shortMeta;
    category.textContent = item.category.label;
    folder.textContent = item.folder;
    if (item.id === state.selectedId) {
      main.classList.add("active");
    }

    main.addEventListener("click", () => {
      state.selectedId = item.id;
      render();
    });

    node.dataset.fileId = item.id;
    els.fileList.appendChild(node);
  });
}

function renderDetail() {
  const current = state.files.find((item) => item.id === state.selectedId);
  if (!current) {
    els.detailEmpty.classList.remove("hidden");
    els.detailView.classList.add("hidden");
    return;
  }

  els.detailEmpty.classList.add("hidden");
  els.detailView.classList.remove("hidden");
  els.detailName.textContent = current.name;
  els.detailMeta.textContent = `${current.displaySize} · ${current.category.label} · ${current.confidence}%`;
  els.detailFolder.textContent = current.folder;
  els.detailRename.textContent = current.rename;
  els.detailReason.textContent = current.reason;
  els.detailTags.innerHTML = "";
  current.tags.forEach((tag) => {
    const span = document.createElement("span");
    span.className = "tag";
    span.textContent = tag;
    els.detailTags.appendChild(span);
  });
}

function syncButtons() {
  const hasFiles = state.files.length > 0;
  els.exportBtn.disabled = !hasFiles;
  els.clearBtn.disabled = !hasFiles;
}

function filteredFiles() {
  return state.files.filter((item) => {
    const matchesQuery = !state.query
      || item.name.toLowerCase().includes(state.query)
      || item.category.label.toLowerCase().includes(state.query)
      || item.folder.toLowerCase().includes(state.query)
      || item.tags.some((tag) => tag.toLowerCase().includes(state.query))
      || item.reason.toLowerCase().includes(state.query);

    const matchesView =
      state.view === "all"
      || (state.view === "priority" && item.priority >= 60)
      || (state.view === "confident" && item.confidence >= 70)
      || (state.view === "uncertain" && item.confidence < 55);

    return matchesQuery && matchesView;
  });
}

function exportPlan() {
  const rows = state.files.map((item) => [
    item.name,
    item.folder,
    item.rename,
    item.category.label,
    item.priority,
    item.confidence,
    item.tags.join(" | "),
    item.reason,
  ]);

  const csv = [
    ["原文件名", "建议目录", "建议重命名", "分类", "优先级", "置信度", "标签", "理由"].join(","),
    ...rows.map((row) => row.map(csvEscape).join(",")),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "jack-文件整理清单.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

function hasAny(fileLike, keywords) {
  const haystack = `${fileLike.name || ""} ${fileLike.text || ""}`.toLowerCase();
  return keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
}

function isTextFile(file) {
  const ext = extOf(file.name);
  return [
    "txt",
    "md",
    "markdown",
    "json",
    "csv",
    "ts",
    "tsx",
    "js",
    "jsx",
    "html",
    "css",
    "xml",
    "yaml",
    "yml",
    "log",
    "pdf",
  ].includes(ext) && !isBinary(file);
}

function isImageFile(file) {
  return file.type.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp", "heic", "avif"].includes(extOf(file.name));
}

function isVideoFile(file) {
  return file.type.startsWith("video/") || ["mp4", "mov", "m4v", "avi", "mkv", "webm"].includes(extOf(file.name));
}

function isBinary(file) {
  const ext = extOf(file.name);
  return ["pdf"].includes(ext);
}

function inferType(name) {
  const ext = extOf(name);
  if (["jpg", "jpeg", "png", "webp", "gif", "heic", "avif"].includes(ext)) return "image";
  if (["mp4", "mov", "m4v", "avi", "mkv", "webm"].includes(ext)) return "video";
  if (["txt", "md", "markdown", "json", "csv", "ts", "tsx", "js", "jsx", "html", "css", "xml", "yaml", "yml", "log", "pdf"].includes(ext)) return "text";
  return "unknown";
}

function extOf(name) {
  const parts = name.split(".");
  if (parts.length < 2) {
    return "";
  }
  return parts.pop().toLowerCase();
}

function cleanBaseName(name) {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/[ _]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/[^a-zA-Z0-9\u4e00-\u9fa5-]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "untitled";
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "-";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let idx = 0;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[idx]}`;
}

function csvEscape(value) {
  const str = String(value ?? "");
  return `"${str.replace(/"/g, '""')}"`;
}
