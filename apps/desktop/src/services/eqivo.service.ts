import axios from "axios";

const API_URL = "https://eqivo-telephony.p.rapidapi.com";
const BASE_URL = `${API_URL}/v0.1`;
const HOST = "eqivo-telephony.p.rapidapi.com";

const getApiKey = (): string => {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    throw new Error("RAPIDAPI_KEY environment variable is not set");
  }
  return apiKey;
};

const getHeaders = (
  contentType: string = "application/x-www-form-urlencoded"
) => ({
  "x-rapidapi-key": getApiKey(),
  "x-rapidapi-host": HOST,
  "content-type": contentType,
});

interface CallResponse {
  RequestUUID?: string;
  CallUUID?: string;
  call_uuid?: string;
  id?: string;
  Message?: string;
  Success?: boolean;
}

interface CallStatusResponse {
  CallUUID?: string;
  CallStatus?: string;
  status?: string;
  call_status?: string;
  Direction?: string;
  CallerName?: string;
  CallerNumber?: string;
  CalledNumber?: string;
  CallStartTime?: string;
  CallAnswerTime?: string;
  CallEndTime?: string;
  CallDuration?: number;
}

export const startOutboundCall = async (
  to: string,
  from: string
): Promise<{ id: string; to: string; status: string; timestamp: number }> => {
  if (!to || !to.trim()) {
    throw new Error("Destination phone number (to) is required");
  }
  if (!from || !from.trim()) {
    throw new Error("Caller ID (from) is required");
  }

  const gateways = process.env.EQIVO_GATEWAYS || "user/";
  const answerUrl =
    process.env.EQIVO_ANSWER_URL || "https://demo.eqivo.org/answer.xml";
  const hangupUrl = process.env.EQIVO_HANGUP_URL || "";
  const ringUrl = process.env.EQIVO_RING_URL || "";

  const params = new URLSearchParams({
    To: to.trim(),
    From: from.trim(),
    Gateways: gateways,
    AnswerUrl: answerUrl,
  });

  if (hangupUrl) {
    params.append("HangupUrl", hangupUrl);
  }
  if (ringUrl) {
    params.append("RingUrl", ringUrl);
  }
  if (process.env.EQIVO_TIME_LIMIT) {
    params.append("TimeLimit", process.env.EQIVO_TIME_LIMIT);
  }
  if (process.env.EQIVO_HANGUP_ON_RING) {
    params.append("HangupOnRing", process.env.EQIVO_HANGUP_ON_RING);
  }

  try {
    const endpoint = `${BASE_URL}/Call`;
    const response = await axios.post<CallResponse>(endpoint, params, {
      headers: getHeaders(),
    });

    const callUuid =
      response.data.RequestUUID ||
      response.data.CallUUID ||
      response.data.call_uuid ||
      response.data.id;

    if (!callUuid) {
      throw new Error(
        `API response did not contain a call UUID. Response: ${JSON.stringify(
          response.data
        )}`
      );
    }

    return {
      id: callUuid,
      to: to.trim(),
      status: "initiated",
      timestamp: Date.now(),
    };
  } catch (error: any) {
    console.error("Call Initiation Failed:", {
      url: `${BASE_URL}/Call`,
      method: "POST",
      error: error.response?.data || error.message,
      status: error.response?.status,
      headers: error.config?.headers,
    });

    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      if (status === 400) {
        throw new Error(
          `Invalid request: ${data?.message || data?.Message || "Bad request"}`
        );
      } else if (status === 401) {
        throw new Error("Authentication failed. Check your RAPIDAPI_KEY.");
      } else if (status === 404) {
        throw new Error(
          "API endpoint not found. Please check the API version or endpoint path."
        );
      } else if (status === 405) {
        throw new Error("Method not allowed (405)");
      } else {
        throw new Error(
          `API request failed (${status}): ${
            data?.message || data?.Message || error.message
          }`
        );
      }
    }

    throw new Error(`Failed to start call: ${error.message}`);
  }
};

export const getCallStatus = async (callUuid: string): Promise<string> => {
  if (!callUuid || !callUuid.trim()) {
    throw new Error("Call UUID is required");
  }

  try {
    const response = await axios.get<CallStatusResponse>(
      `${BASE_URL}/Call/${callUuid}/`,
      {
        headers: getHeaders("application/json"),
      }
    );

    const apiStatus =
      response.data.CallStatus ||
      response.data.status ||
      response.data.call_status;

    if (!apiStatus) {
      if (response.data.CallUUID) {
        return "unknown";
      }
      throw new Error("Call status not found in API response");
    }

    const normalizedStatus = apiStatus.toLowerCase();

    const statusMap: Record<string, string> = {
      initiated: "initiated",
      ringing: "ringing",
      answered: "answered",
      "in-progress": "answered",
      completed: "ended",
      ended: "ended",
      hangup: "ended",
      failed: "failed",
      busy: "failed",
      "no-answer": "failed",
      cancelled: "ended",
    };

    return statusMap[normalizedStatus] || normalizedStatus;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return "ended";
    }

    console.error("Fetch Call Status Failed:", {
      callUuid,
      error: error.response?.data || error.message,
      status: error.response?.status,
    });

    throw new Error(
      `Failed to get call status: ${
        error.response?.data?.message || error.message
      }`
    );
  }
};

export const getCallDetails = async (
  callUuid: string
): Promise<CallStatusResponse> => {
  if (!callUuid || !callUuid.trim()) {
    throw new Error("Call UUID is required");
  }

  try {
    const response = await axios.get<CallStatusResponse>(
      `${BASE_URL}/Call/${callUuid}/`,
      {
        headers: getHeaders("application/json"),
      }
    );

    return response.data;
  } catch (error: any) {
    console.error("Fetch Call Details Failed:", {
      callUuid,
      error: error.response?.data || error.message,
    });

    if (error.response?.status === 404) {
      throw new Error("Call not found");
    }

    throw new Error(
      `Failed to get call details: ${
        error.response?.data?.message || error.message
      }`
    );
  }
};

let mockModeEnabled = false;

export const setMockMode = (enabled: boolean) => {
  mockModeEnabled = enabled;
  console.log(`Mock mode ${enabled ? "enabled" : "disabled"}`);
};

export const getMockMode = (): boolean => {
  return mockModeEnabled;
};

export const startOutboundCallMock = async (
  to: string,
  from: string
): Promise<{ id: string; to: string; status: string; timestamp: number }> => {
  await new Promise((resolve) => setTimeout(resolve, 500));

  const callUuid = `mock-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 11)}`;

  return {
    id: callUuid,
    to: to.trim(),
    status: "initiated",
    timestamp: Date.now(),
  };
};

export const getCallStatusMock = async (callUuid: string): Promise<string> => {
  await new Promise((resolve) => setTimeout(resolve, 200));

  const timestamp = parseInt(callUuid.split("-")[1]) || Date.now();
  const age = Date.now() - timestamp;

  if (age < 1000) {
    return "initiated";
  } else if (age < 2000) {
    return "ringing";
  } else if (age < 4000) {
    return "answered";
  } else {
    return "ended";
  }
};

export const startOutboundCallWithMode = async (
  to: string,
  from: string
): Promise<{ id: string; to: string; status: string; timestamp: number }> => {
  if (mockModeEnabled) {
    console.log("🔧 Using MOCK API mode");
    return startOutboundCallMock(to, from);
  }
  return startOutboundCall(to, from);
};

export const getCallStatusWithMode = async (
  callUuid: string
): Promise<string> => {
  if (mockModeEnabled) {
    return getCallStatusMock(callUuid);
  }
  return getCallStatus(callUuid);
};
