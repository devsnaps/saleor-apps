import { Client } from "urql";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  AvataxForbiddenAccessError,
  AvataxGetTaxSystemError,
  AvataxInvalidCredentialsError,
} from "@/modules/taxes/tax-error";

import { AvataxClientTaxCodeService } from "../avatax/avatax-client-tax-code.service";
import { AVATAX_PROBLEM_KEYS, reportAvataxProblemFromError } from "./avatax-problem-reporter";

const mockReportProblem = vi.fn();

vi.mock("@saleor/app-problems", () => ({
  AppProblemsReporter: vi.fn().mockImplementation(() => ({
    reportProblem: mockReportProblem,
  })),
}));

function createMockClient(): Client {
  return {} as Client;
}

describe("reportAvataxProblemFromError", () => {
  beforeEach(() => {
    mockReportProblem.mockReset();
    mockReportProblem.mockResolvedValue({ isOk: () => true, mapErr: vi.fn() });
  });

  it("reports invalid credentials for AvataxInvalidCredentialsError", async () => {
    const error = new AvataxInvalidCredentialsError("Auth failed");

    await reportAvataxProblemFromError(createMockClient(), error);

    expect(mockReportProblem).toHaveBeenCalledWith(
      expect.objectContaining({
        key: AVATAX_PROBLEM_KEYS.INVALID_CREDENTIALS,
        criticalThreshold: 1,
      }),
    );
  });

  it("reports forbidden access for AvataxForbiddenAccessError", async () => {
    const error = new AvataxForbiddenAccessError("PermissionRequired");

    await reportAvataxProblemFromError(createMockClient(), error);

    expect(mockReportProblem).toHaveBeenCalledWith(
      expect.objectContaining({
        key: AVATAX_PROBLEM_KEYS.FORBIDDEN_ACCESS,
        criticalThreshold: 1,
      }),
    );
  });

  it("reports company inactive for AvataxGetTaxSystemError with InactiveCompanyError faultSubCode", async () => {
    const error = new AvataxGetTaxSystemError("GetTaxError", {
      props: {
        faultSubCode: "InactiveCompanyError",
        description: "Company is inactive",
        message: "Error",
      },
    });

    await reportAvataxProblemFromError(createMockClient(), error);

    expect(mockReportProblem).toHaveBeenCalledWith(
      expect.objectContaining({
        key: AVATAX_PROBLEM_KEYS.COMPANY_INACTIVE,
        criticalThreshold: 1,
      }),
    );
  });

  it("reports company not found for AvataxGetTaxSystemError with CompanyNotFoundError faultSubCode", async () => {
    const error = new AvataxGetTaxSystemError("GetTaxError", {
      props: {
        faultSubCode: "CompanyNotFoundError",
        description: "Company not found",
        message: "Error",
      },
    });

    await reportAvataxProblemFromError(createMockClient(), error);

    expect(mockReportProblem).toHaveBeenCalledWith(
      expect.objectContaining({
        key: AVATAX_PROBLEM_KEYS.COMPANY_NOT_FOUND,
        criticalThreshold: 1,
      }),
    );
  });

  it("does not report for AvataxGetTaxSystemError with unrelated faultSubCode", async () => {
    const error = new AvataxGetTaxSystemError("GetTaxError", {
      props: {
        faultSubCode: "TaxRegionError",
        description: "Region error",
        message: "Error",
      },
    });

    await reportAvataxProblemFromError(createMockClient(), error);

    expect(mockReportProblem).not.toHaveBeenCalled();
  });

  it("reports tax code permission for AvataxClientTaxCodeService.ForbiddenAccessError", async () => {
    const error = new AvataxClientTaxCodeService.ForbiddenAccessError("Permission error");

    await reportAvataxProblemFromError(createMockClient(), error);

    expect(mockReportProblem).toHaveBeenCalledWith(
      expect.objectContaining({
        key: AVATAX_PROBLEM_KEYS.TAX_CODE_PERMISSION,
        criticalThreshold: 3,
      }),
    );
  });

  it("does not report for unrelated errors", async () => {
    await reportAvataxProblemFromError(createMockClient(), new Error("Some random error"));

    expect(mockReportProblem).not.toHaveBeenCalled();
  });

  it("does not report for undefined/null errors", async () => {
    await reportAvataxProblemFromError(createMockClient(), undefined);

    expect(mockReportProblem).not.toHaveBeenCalled();
  });
});
