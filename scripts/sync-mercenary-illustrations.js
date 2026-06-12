#!/usr/bin/env node
/**
 * RMBG 결과 파일명을 imageKey.png로 정리해서 public/assets에 복사한다.
 *
 * 예:
 * R_r_android_defense_module_aira_방어모듈_에이라_0001_transparent.png
 * ->
 * public/assets/mercenary/characters/standing/r_android_defense_module_aira.png
 */

const fs = require("fs");
const path = require("path");

const VALID_GRADES = ["N", "R", "SR", "SSR", "EX"];
const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

function parseArgs(argv) {
  const args = {
    sourceRoot: "",
    projectRoot: process.cwd(),
    grades: "N,R,SR,SSR",
    overwrite: false,
    dryRun: false,
    verbose: false,
    manifest: "",
  };

  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];

    if (token === "--overwrite") {
      args.overwrite = true;
      continue;
    }

    if (token === "--dry-run") {
      args.dryRun = true;
      continue;
    }

    if (token === "--verbose") {
      args.verbose = true;
      continue;
    }

    if (token.startsWith("--")) {
      const key = token
        .slice(2)
        .replace(/-([a-z])/g, (_, c) => c.toUpperCase());

      const value = argv[i + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`${token} 값이 없습니다.`);
      }

      args[key] = value;
      i += 1;
      continue;
    }

    throw new Error(`알 수 없는 인자: ${token}`);
  }

  if (!args.sourceRoot) {
    throw new Error("--source-root가 필요합니다.");
  }

  args.sourceRoot = path.resolve(args.sourceRoot);
  args.projectRoot = path.resolve(args.projectRoot);
  args.grades = new Set(
    String(args.grades)
      .split(",")
      .map((v) => v.trim().toUpperCase())
      .filter(Boolean),
  );

  for (const grade of args.grades) {
    if (!VALID_GRADES.includes(grade)) {
      throw new Error(`잘못된 등급: ${grade}`);
    }
  }

  args.manifest = args.manifest
    ? path.resolve(args.manifest)
    : path.join(args.sourceRoot, "illustration_sync_manifest.csv");

  return args;
}

function walkFiles(root) {
  const result = [];

  if (!fs.existsSync(root)) {
    return result;
  }

  const entries = fs.readdirSync(root, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);

    if (entry.isDirectory()) {
      result.push(...walkFiles(fullPath));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (IMAGE_EXTS.has(ext)) {
      result.push(fullPath);
    }
  }

  return result;
}

function detectGrade(filePath) {
  const parts = filePath.split(/[\\/]/).map((part) => part.toUpperCase());

  for (let i = parts.length - 2; i >= 0; i -= 1) {
    if (VALID_GRADES.includes(parts[i])) {
      return parts[i];
    }
  }

  const fileName = path.basename(filePath);
  const match = fileName.match(/^(SSR|SR|EX|R|N)[_-]/i);
  return match ? match[1].toUpperCase() : "";
}

function stripSuffixes(stem) {
  let value = stem;

  value = value.replace(/_transparent$/i, "");
  value = value.replace(/_rmbg$/i, "");
  value = value.replace(/_no_bg$/i, "");
  value = value.replace(/_nobg$/i, "");
  value = value.replace(/_\d{3,6}$/i, "");

  return value;
}

function extractImageKey(filePath, grade) {
  const ext = path.extname(filePath);
  let stem = path.basename(filePath, ext);

  stem = stripSuffixes(stem);

  if (grade) {
    stem = stem.replace(new RegExp(`^${grade}[_-]`, "i"), "");
  } else {
    stem = stem.replace(/^(SSR|SR|EX|R|N)[_-]/i, "");
  }

  const match = stem.match(/^([A-Za-z0-9]+(?:_[A-Za-z0-9]+)*)/);
  if (!match) {
    return "";
  }

  return match[1].replace(/_+$/g, "").toLowerCase();
}

function getTargetPath(projectRoot, grade, imageKey) {
  if (grade === "N") {
    return path.join(
      projectRoot,
      "public",
      "assets",
      "mercenary",
      "characters",
      "n_common",
      `${imageKey}.png`,
    );
  }

  return path.join(
    projectRoot,
    "public",
    "assets",
    "mercenary",
    "characters",
    "standing",
    `${imageKey}.png`,
  );
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function csvEscape(value) {
  const text = value === undefined || value === null ? "" : String(value);

  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function writeManifest(manifestPath, rows) {
  const headers = [
    "grade",
    "imageKey",
    "sourceFile",
    "targetFile",
    "status",
    "message",
  ];

  const lines = [headers.join(",")];

  for (const row of rows) {
    lines.push(headers.map((header) => csvEscape(row[header])).join(","));
  }

  ensureDir(path.dirname(manifestPath));
  fs.writeFileSync(manifestPath, "\uFEFF" + lines.join("\n"), "utf8");
}

function main() {
  const args = parseArgs(process.argv);
  const files = walkFiles(args.sourceRoot);
  const manifest = [];

  let copied = 0;
  let skipped = 0;
  let failed = 0;
  let ignored = 0;

  console.log(`[INFO] sourceRoot: ${args.sourceRoot}`);
  console.log(`[INFO] projectRoot: ${args.projectRoot}`);
  console.log(`[INFO] grades: ${Array.from(args.grades).join(",")}`);
  console.log(`[INFO] files found: ${files.length}`);
  console.log(`[INFO] mode: ${args.dryRun ? "dry-run" : "copy"}`);

  for (const sourceFile of files) {
    const grade = detectGrade(sourceFile);

    if (!grade || !args.grades.has(grade)) {
      ignored += 1;
      continue;
    }

    const imageKey = extractImageKey(sourceFile, grade);

    if (!imageKey) {
      failed += 1;
      manifest.push({
        grade,
        imageKey: "",
        sourceFile,
        targetFile: "",
        status: "failed",
        message: "imageKey 추출 실패",
      });
      continue;
    }

    const targetFile = getTargetPath(args.projectRoot, grade, imageKey);

    if (fs.existsSync(targetFile) && !args.overwrite) {
      skipped += 1;
      manifest.push({
        grade,
        imageKey,
        sourceFile,
        targetFile,
        status: "skipped",
        message: "이미 파일이 있음. 덮어쓰려면 --overwrite 사용",
      });
      continue;
    }

    try {
      if (!args.dryRun) {
        ensureDir(path.dirname(targetFile));
        fs.copyFileSync(sourceFile, targetFile);
      }

      copied += 1;

      manifest.push({
        grade,
        imageKey,
        sourceFile,
        targetFile,
        status: args.dryRun ? "dry-run" : "copied",
        message: "",
      });

      if (args.verbose) {
        console.log(`[COPY] ${sourceFile}`);
        console.log(`   -> ${targetFile}`);
      }
    } catch (error) {
      failed += 1;

      manifest.push({
        grade,
        imageKey,
        sourceFile,
        targetFile,
        status: "failed",
        message: error.message,
      });
    }
  }

  writeManifest(args.manifest, manifest);

  console.log(`[DONE] copied=${copied}, skipped=${skipped}, failed=${failed}, ignored=${ignored}`);
  console.log(`[DONE] manifest=${args.manifest}`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

try {
  main();
} catch (error) {
  console.error(`[ERROR] ${error.message}`);
  process.exit(1);
}
