import { Suspense } from "react";
import { LanguageTabs } from "@/components/tools/language-tabs";
import { ToolCatalog, ToolCatalogSkeleton } from "@/components/tools/tool-catalog";
import type { Tool } from "@/lib/types";

// Mock data until backend APIs are ready
const mockTools: Tool[] = [
  {
    id: 1,
    name: "Python 格式化工具",
    description: "使用 Black 格式化 Python 代码，确保代码风格一致。",
    language: "python",
    script_path: "tools/python/formatter.py",
    parameters: [
      { name: "code", label: "Python 代码", type: "string", required: true, placeholder: "粘贴你的 Python 代码..." },
      { name: "line_length", label: "行宽", type: "number", required: false, default: "88", placeholder: "88" },
    ],
    created_at: "2026-03-01T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z",
  },
  {
    id: 2,
    name: "Python 依赖检查",
    description: "检查 requirements.txt 中的依赖是否有已知安全漏洞。",
    language: "python",
    script_path: "tools/python/dep-check.py",
    parameters: [
      { name: "requirements", label: "依赖列表", type: "string", required: true, placeholder: "flask==2.0.1\nrequests==2.28.0" },
    ],
    created_at: "2026-03-01T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z",
  },
  {
    id: 3,
    name: "Java 编译运行",
    description: "编译并运行 Java 代码片段，支持标准输入。",
    language: "java",
    script_path: "tools/java/runner.sh",
    parameters: [
      { name: "code", label: "Java 代码", type: "string", required: true, placeholder: "public class Main { ... }" },
      { name: "stdin", label: "标准输入", type: "string", required: false, placeholder: "可选输入数据" },
    ],
    created_at: "2026-03-01T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z",
  },
  {
    id: 4,
    name: "Bash 脚本执行",
    description: "在安全沙箱中执行 Bash 脚本，支持常用 Linux 命令。",
    language: "bash",
    script_path: "tools/bash/executor.sh",
    parameters: [
      { name: "script", label: "Bash 脚本", type: "string", required: true, placeholder: "#!/bin/bash\necho 'Hello'" },
    ],
    created_at: "2026-03-01T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z",
  },
  {
    id: 5,
    name: "JSON 格式化",
    description: "格式化和验证 JSON 数据，支持压缩和美化输出。",
    language: "python",
    script_path: "tools/python/json-formatter.py",
    parameters: [
      { name: "json_input", label: "JSON 数据", type: "string", required: true, placeholder: '{"key": "value"}' },
      { name: "indent", label: "缩进", type: "select", required: false, default: "2", options: ["2", "4", "tab"] },
    ],
    created_at: "2026-03-01T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z",
  },
  {
    id: 6,
    name: "系统信息查看",
    description: "获取当前服务器的系统信息，包括 CPU、内存、磁盘等。",
    language: "bash",
    script_path: "tools/bash/sysinfo.sh",
    parameters: [],
    created_at: "2026-03-01T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z",
  },
];

function filterTools(tools: Tool[], language?: string): Tool[] {
  if (!language || language === "all") return tools;
  return tools.filter((t) => t.language === language);
}

export default async function ToolsPage({
  searchParams,
}: {
  searchParams: Promise<{ language?: string }>;
}) {
  const params = await searchParams;
  const tools = filterTools(mockTools, params.language);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tools</h1>
        <p className="text-muted-foreground">多语言工具平台</p>
      </div>

      <Suspense>
        <LanguageTabs />
      </Suspense>

      <Suspense fallback={<ToolCatalogSkeleton />}>
        <ToolCatalog tools={tools} />
      </Suspense>
    </div>
  );
}
