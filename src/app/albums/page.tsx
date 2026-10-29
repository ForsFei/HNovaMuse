import { CatalogPage } from "@/components/catalog-page";
export default async function AlbumsPage({ searchParams }: { searchParams: Promise<{ selected?: string }> }) {
  const id = Number((await searchParams).selected);
  return <CatalogPage kind="albums" selectedId={Number.isInteger(id) && id > 0 ? id : null}/>;
}
