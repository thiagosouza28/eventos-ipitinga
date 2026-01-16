import { cacheDelete, cacheDeletePrefix } from "../../utils/cache";

const PUBLIC_LIST_KEY = "events:public:list";
const PUBLIC_SLUG_PREFIX = "events:public:slug:";

export const publicEventListCacheKey = () => PUBLIC_LIST_KEY;

export const publicEventSlugCacheKey = (slug: string) => `${PUBLIC_SLUG_PREFIX}${slug}`;

export const invalidatePublicEventCache = (options?: { slug?: string | null; clearAll?: boolean }) => {
  cacheDelete(PUBLIC_LIST_KEY);
  if (options?.clearAll) {
    cacheDeletePrefix(PUBLIC_SLUG_PREFIX);
    return;
  }
  if (options?.slug) {
    cacheDelete(publicEventSlugCacheKey(options.slug));
  }
};
