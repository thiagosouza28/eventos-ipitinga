import "@/prisma/generated/client";

declare module "@/prisma/generated/client" {
  interface Event {
    isFree: boolean;
    noticeEnabled?: boolean | null;
    noticeTitle?: string | null;
    noticeBullets?: string | null;
    noticeFooterText?: string | null;
    noticeShowOnce?: boolean | null;
  }

  namespace Prisma {
    interface EventCreateInput {
      isFree?: boolean;
    }

    interface EventUncheckedCreateInput {
      isFree?: boolean;
    }

    interface EventUpdateInput {
      isFree?: boolean;
    }

    interface EventUncheckedUpdateInput {
      isFree?: boolean;
    }
  }
}
