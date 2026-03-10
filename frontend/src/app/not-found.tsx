import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-6xl font-bold">404</h1>
      <p className="text-muted-foreground text-lg">页面未找到</p>
      <Button nativeButton={false} render={<Link href="/" />}>返回首页</Button>
    </div>
  );
}
