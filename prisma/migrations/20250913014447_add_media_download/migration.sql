-- CreateTable
CREATE TABLE "public"."MediaDownload" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "downloadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaDownload_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."MediaDownload" ADD CONSTRAINT "MediaDownload_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "public"."Message"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MediaDownload" ADD CONSTRAINT "MediaDownload_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
