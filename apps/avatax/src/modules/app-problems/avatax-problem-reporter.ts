import { AppProblemsReporter } from "@saleor/app-problems";
import { Client } from "urql";

import { createLogger } from "@/logger";
import {
  AvataxForbiddenAccessError,
  AvataxGetTaxSystemError,
  AvataxInvalidCredentialsError,
} from "@/modules/taxes/tax-error";

import { AvataxClientTaxCodeService } from "../avatax/avatax-client-tax-code.service";

const logger = createLogger("AvataxProblemReporter");

export const AVATAX_PROBLEM_KEYS = {
  INVALID_CREDENTIALS: "avatax-invalid-credentials",
  FORBIDDEN_ACCESS: "avatax-forbidden-access",
  COMPANY_INACTIVE: "avatax-company-inactive",
  COMPANY_NOT_FOUND: "avatax-company-not-found",
  TAX_CODE_PERMISSION: "avatax-tax-code-permission",
} as const;

const PROBLEM_MESSAGES: Record<string, string> = {
  [AVATAX_PROBLEM_KEYS.INVALID_CREDENTIALS]:
    "AvaTax API credentials are invalid or expired. Tax calculations are failing. Please update your AvaTax credentials in the app configuration.",
  [AVATAX_PROBLEM_KEYS.FORBIDDEN_ACCESS]:
    "AvaTax API key lacks required permissions (PermissionRequired). Please verify your AvaTax license permissions with Avalara support.",
  [AVATAX_PROBLEM_KEYS.COMPANY_INACTIVE]:
    "AvaTax company account is inactive. Tax operations are not allowed. Please reactivate your company in AvaTax or update the configuration.",
  [AVATAX_PROBLEM_KEYS.COMPANY_NOT_FOUND]:
    "AvaTax company code not found. The configured company does not exist. Please verify the company code in your AvaTax configuration.",
  [AVATAX_PROBLEM_KEYS.TAX_CODE_PERMISSION]:
    "Unable to list AvaTax tax codes due to insufficient permissions. Your API key may lack the required scope. Please verify your license with Avalara support.",
};

function createReporter(client: Client) {
  return new AppProblemsReporter(client);
}

async function reportProblem(
  reporter: AppProblemsReporter,
  key: string,
  criticalThreshold?: number,
) {
  const message = PROBLEM_MESSAGES[key];

  if (!message) {
    logger.error("Unknown problem key", { key });

    return;
  }

  const result = await reporter.reportProblem({
    key,
    message,
    ...(criticalThreshold !== undefined ? { criticalThreshold } : {}),
  });

  result.mapErr((error) => {
    logger.error("Failed to report app problem to Saleor", { error, key });
  });
}

/**
 * Maps a caught AvaTax error to an appropriate app problem report.
 * Should be called in `after()` to avoid blocking the webhook response.
 */
export async function reportAvataxProblemFromError(client: Client, error: unknown) {
  const reporter = createReporter(client);

  if (error instanceof AvataxInvalidCredentialsError) {
    await reportProblem(reporter, AVATAX_PROBLEM_KEYS.INVALID_CREDENTIALS, 1);

    return;
  }

  if (error instanceof AvataxForbiddenAccessError) {
    await reportProblem(reporter, AVATAX_PROBLEM_KEYS.FORBIDDEN_ACCESS, 1);

    return;
  }

  if (error instanceof AvataxGetTaxSystemError) {
    const faultSubCode = error.faultSubCode;

    if (faultSubCode === "InactiveCompanyError") {
      await reportProblem(reporter, AVATAX_PROBLEM_KEYS.COMPANY_INACTIVE, 1);

      return;
    }

    if (faultSubCode === "CompanyNotFoundError") {
      await reportProblem(reporter, AVATAX_PROBLEM_KEYS.COMPANY_NOT_FOUND, 1);

      return;
    }
  }

  if (error instanceof AvataxClientTaxCodeService.ForbiddenAccessError) {
    await reportProblem(reporter, AVATAX_PROBLEM_KEYS.TAX_CODE_PERMISSION, 3);

    return;
  }
}
