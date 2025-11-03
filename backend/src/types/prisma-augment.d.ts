import "@prisma/client";

declare module "@prisma/client" {
  interface Event {
    isFree: boolean;
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
