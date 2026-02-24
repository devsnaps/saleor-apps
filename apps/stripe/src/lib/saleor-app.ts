import { type APL } from "@saleor/app-sdk/APL";
import { DynamoAPL } from "@saleor/app-sdk/APL/dynamodb";
import { FileAPL } from "@saleor/app-sdk/APL/file";
import { RedisAPL } from "@saleor/app-sdk/APL/redis";
import { SaleorApp } from "@saleor/app-sdk/saleor-app";
import { createClient } from "redis";

import { createLogger } from "@/lib/logger";
import { dynamoMainTable } from "@/modules/dynamodb/dynamo-main-table";

import { env } from "./env";

const logger = createLogger("saleor-app");

export let apl: APL;
switch (env.APL) {
  case "dynamodb": {
    apl = DynamoAPL.create({
      table: dynamoMainTable,
      externalLogger: (message, level) => {
        if (level === "error") {
          logger.error(`[DynamoAPL] ${message}`);
        } else {
          logger.debug(`[DynamoAPL] ${message}`);
        }
      },
    });

    break;
  }

  case "redis": {
    if (!env.REDIS_URL) {
      throw new Error("Redis APL is not configured - missing REDIS_URL");
    }

    apl = new RedisAPL({
      client: createClient({
        url: env.REDIS_URL,
      }),
    });

    break;
  }

  default: {
    apl = new FileAPL();
    break;
  }
}

export const saleorApp = new SaleorApp({
  apl,
});
