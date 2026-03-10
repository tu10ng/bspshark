"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const languages = [
  { value: "all", label: "全部" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "bash", label: "Bash" },
];

export function LanguageTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("language") ?? "all";

  return (
    <Tabs
      value={current}
      onValueChange={(value) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value === "all") {
          params.delete("language");
        } else {
          params.set("language", value);
        }
        const qs = params.toString();
        router.push(`/tools${qs ? `?${qs}` : ""}`);
      }}
    >
      <TabsList>
        {languages.map((lang) => (
          <TabsTrigger key={lang.value} value={lang.value}>
            {lang.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
