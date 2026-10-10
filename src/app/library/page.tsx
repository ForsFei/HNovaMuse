import { LibraryView } from "@/components/library-view";
export default async function LibraryPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  return <LibraryView initialQuery={(await searchParams).q || ""}/>;
}
