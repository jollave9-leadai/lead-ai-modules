// Lead AI Module
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  postCallActionSMSBody,
  postCallActionSMSBodyToCaller,
  sendSMS,
} from "./sms-service.ts";
import { extractPostCallAction } from "./post-call-action.ts";

export function customClient(url: string, key: string) {
  const client = createClient(url, key);
  return {
    async getPostCallActionSetup(agent_id: string) {
      return client
        .schema("lead_dialer")
        .from("post_call_action_setup")
        .select("*")
        .eq("agent_id", agent_id);
    },
    async getVapiByPhoneNumberId(phone_number_id: string) {
      return client
        .schema("lead_dialer")
        .from("vapi_integration")
        .select("*")
        .eq("phoneNumberId", phone_number_id)
        .single();
    },
    async getAgentById(agent_id: string) {
      return client
        .schema("lead_dialer")
        .from("agents")
        .select("*")
        .eq("id", agent_id)
        .single();
    },
  };
}

export const executePostCallAction = async (
  url,
  key,
  {
    phoneNumberId,
    summary,
    endReason,
    parsedContent,
    nowFormattedUTC,
    transcript,
    message,
    telnyxKey,
    callerNumber: customerNumber,
  }
) => {
  const vapi = await customClient(url, key).getVapiByPhoneNumberId(
    phoneNumberId
  );
  const { data: postCallActionSetup } = await customClient(
    url,
    key
  ).getPostCallActionSetup(vapi.data.agent_id);

  const { data: agent } = await customClient(url, key).getAgentById(
    vapi.data.agent_id
  );
  console.log("from module agent", agent);
  const {
    email,
    email_enabled,
    email_from_outcome,
    phone_number,
    sms_enabled,
    sms_from_outcome,
    sms_to_caller_enabled,
    sms_to_caller_template,
    sms_to_caller_from_outcome,
  } = extractPostCallAction(postCallActionSetup);

  if (
    sms_enabled &&
    // if outcome is null means it is from inbound agent config so notify regardless the outcome
    (sms_from_outcome === null ||
      (sms_from_outcome as string)?.split(",").includes(parsedContent?.outcome))
  ) {
    const smsPayload = {
      summary,
      outcome: parsedContent.outcome,
      nowFormattedUTC,
      callerNumber: customerNumber,
    };

    const smsBody = postCallActionSMSBody(smsPayload);
    console.log("vapi.data.phone_number", vapi.data.phone_number);
    const telnyxPayload = {
      // from: vapi.data.phone_number,
      from: "+61489900690",
      messaging_profile_id: "400197bf-b007-4314-9f9f-c5cd0b7b67ae",
      to: phone_number as string,
      text: smsBody,
      subject: "From LeadAI!",
      use_profile_webhooks: true,
      type: "SMS",
    };
    console.log("telnyxPayload", telnyxPayload);
    await sendSMS(telnyxPayload, telnyxKey);
  }

  if (
    sms_to_caller_enabled &&
    // if outcome is null means it is from inbound agent config so notify regardless the outcome
    (sms_to_caller_from_outcome === null ||
      (sms_to_caller_from_outcome as string)
        ?.split(",")
        .includes(parsedContent?.outcome))
  ) {
    const smsBodyToCallerPayload = {
      agentName: agent.name,
      sms_to_caller_template,
      callerName: parsedContent.full_name,
    };

    const smsBodyToCusomer = postCallActionSMSBodyToCaller(
      smsBodyToCallerPayload
    );
    console.log("customerNumber", customerNumber);
    console.log("smsBodyToCusomer", smsBodyToCusomer);
    const telnyxPayload = {
      // from: vapi.data.phone_number,
      from: "+61489900690",
      messaging_profile_id: "400197bf-b007-4314-9f9f-c5cd0b7b67ae",
      to: customerNumber as string,
      text: smsBodyToCusomer,
      subject: "From LeadAI!",
      use_profile_webhooks: true,
      type: "SMS",
    };
    console.log("telnyxPayload", telnyxPayload);
    await sendSMS(telnyxPayload, telnyxKey);
  }
};
