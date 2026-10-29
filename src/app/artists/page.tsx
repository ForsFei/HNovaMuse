import { CatalogPage } from "@/components/catalog-page";
export default async function ArtistsPage({ searchParams }: { searchParams: Promise<{ selected?: string }> }) {
  const id = Number((await searchParams).selected);
  return <CatalogPage kind="artists" selectedId={Number.isInteger(id) && id > 0 ? id : null}/>;
}
