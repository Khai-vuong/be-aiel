-- CreateEnum
CREATE TYPE "AiConversationStatus" AS ENUM ('active', 'archived');

-- CreateEnum
CREATE TYPE "AiMessageRole" AS ENUM ('system', 'user', 'assistant', 'tool');

-- CreateTable
CREATE TABLE "AiConversation" (
    "acid" TEXT NOT NULL,
    "title" TEXT,
    "status" "AiConversationStatus" NOT NULL DEFAULT 'active',
    "user_id" TEXT NOT NULL,
    "last_message_at" TIMESTAMP(3),
    "metadata_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiConversation_pkey" PRIMARY KEY ("acid")
);

-- CreateTable
CREATE TABLE "AiMessage" (
    "amid" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "role" "AiMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "content_json" JSONB,
    "parent_message_id" TEXT,
    "prompt_tokens" INTEGER,
    "completion_tokens" INTEGER,
    "total_tokens" INTEGER,
    "model_name" TEXT,
    "metadata_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiMessage_pkey" PRIMARY KEY ("amid")
);

-- CreateTable
CREATE TABLE "AiConversationSummary" (
    "asid" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "upto_message_id" TEXT NOT NULL,
    "summary_text" TEXT NOT NULL,
    "summary_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiConversationSummary_pkey" PRIMARY KEY ("asid")
);

-- CreateIndex
CREATE INDEX "AiConversation_user_id_updated_at_idx" ON "AiConversation"("user_id", "updated_at");

-- CreateIndex
CREATE INDEX "AiConversation_status_last_message_at_idx" ON "AiConversation"("status", "last_message_at");

-- CreateIndex
CREATE INDEX "AiMessage_conversation_id_created_at_idx" ON "AiMessage"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "AiMessage_role_created_at_idx" ON "AiMessage"("role", "created_at");

-- CreateIndex
CREATE INDEX "AiMessage_parent_message_id_idx" ON "AiMessage"("parent_message_id");

-- CreateIndex
CREATE INDEX "AiConversationSummary_conversation_id_created_at_idx" ON "AiConversationSummary"("conversation_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "AiConversationSummary_conversation_id_upto_message_id_key" ON "AiConversationSummary"("conversation_id", "upto_message_id");

-- AddForeignKey
ALTER TABLE "AiConversation" ADD CONSTRAINT "AiConversation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiMessage" ADD CONSTRAINT "AiMessage_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "AiConversation"("acid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiMessage" ADD CONSTRAINT "AiMessage_parent_message_id_fkey" FOREIGN KEY ("parent_message_id") REFERENCES "AiMessage"("amid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiConversationSummary" ADD CONSTRAINT "AiConversationSummary_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "AiConversation"("acid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiConversationSummary" ADD CONSTRAINT "AiConversationSummary_upto_message_id_fkey" FOREIGN KEY ("upto_message_id") REFERENCES "AiMessage"("amid") ON DELETE CASCADE ON UPDATE CASCADE;
