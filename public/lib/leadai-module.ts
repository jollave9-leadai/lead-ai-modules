// Lead AI Module
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    callerNumber,
  }
) => {
  const vapi = await customClient(url, key).getVapiByPhoneNumberId(
    phoneNumberId
  );
  const { data: postCallActionSetup } = await customClient(
    url,
    key
  ).getPostCallActionSetup(vapi.data.agent_id);
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
  } = (postCallActionSetup ?? []).reduce(
    (acc, item) => {
      switch (item.channel_type) {
        case "email":
          return {
            ...acc,
            email: item.recipient,
            email_enabled: item.is_enabled,
            email_from_outcome: item.type,
          };
        case "phone":
          return {
            ...acc,
            phone_number: item.recipient,
            sms_enabled: item.is_enabled,
            sms_from_outcome: item.type,
          };
        case "is_to_customer":
          return {
            ...acc,
            sms_to_caller_enabled: item.is_enabled,
            sms_to_caller_template: item.text_content,
            sms_to_caller_from_outcome: item.type,
          };
      }
      return acc;
    },
    {
      email: "",
      email_enabled: false,
      email_from_outcome: "",
      phone_number: "",
      sms_enabled: false,
      sms_from_outcome: "",
      sms_to_caller_enabled: false,
      sms_to_caller_template: "",
      sms_to_caller_from_outcome: "",
    }
  );
  const headerOutcomes = [
    "Appointment booked",
    "Follow-up needed",
    "Callback needed",
  ];
  if (sms_enabled) {
    const smsText = `
[LEAD AI${
      headerOutcomes.includes(parsedContent?.outcome ?? "")
        ? " - " + parsedContent?.outcome?.toUpperCase()
        : ""
    }]

Hi, This is Your AI agent. I received a call from ${
      callerNumber ?? "Unknown number"
    } at ${nowFormattedUTC}.

Summary: ${summary}
Outcome: ${parsedContent?.outcome ?? "Empty outcome"}

(Powered by LeadAI)
`;
    const to = phone_number;
    const telnyxPayload = {
      from: "+61489900690",
      messaging_profile_id: "400197bf-b007-4314-9f9f-c5cd0b7b67ae",
      to: to,
      text: smsText,
      subject: "From LeadAI!",
      use_profile_webhooks: true,
      type: "SMS",
    };
    console.log(telnyxPayload);
    try {
      const smsResponse = await fetch("https://api.telnyx.com/v2/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${telnyxKey}`,
        },
        body: JSON.stringify(telnyxPayload),
      });
      const smsText = await smsResponse.text();
      console.log("Telnyx SMS response:", smsText);
    } catch (smsError) {
      console.error("Failed to send Telnyx SMS:", smsError);
    }
  }
};
