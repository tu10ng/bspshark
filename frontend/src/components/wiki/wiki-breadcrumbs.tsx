import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import type { WikiPageBreadcrumb } from "@/lib/types";

export function WikiBreadcrumbs({
  breadcrumbs,
}: {
  breadcrumbs: WikiPageBreadcrumb[];
}) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink render={<Link href="/wiki" />}>Wiki</BreadcrumbLink>
        </BreadcrumbItem>
        {breadcrumbs.map((crumb, i) => {
          const path = breadcrumbs
            .slice(0, i + 1)
            .map((b) => b.slug)
            .join("/");
          const isLast = i === breadcrumbs.length - 1;
          return (
            <span key={crumb.id} className="contents">
              <BreadcrumbSeparator>
                <span className="text-muted-foreground/60">/</span>
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{crumb.title}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink render={<Link href={`/wiki/${path}`} />}>
                    {crumb.title}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </span>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
