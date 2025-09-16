export const sendSMS = async (
  telnyxPayload: Record<string, unknown>,
  telnyxKey: string
) => {
  try {

    // using fetch instead of axios since using it in supabase edge functions requires esm modules
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
};

export const postCallActionSMSBody = (payload: Record<string, unknown>) => {
  const { callerNumber, nowFormattedUTC, summary, outcome } = payload;
  const headerOutcomes = [
    "Appointment booked",
    "Follow-up needed",
    "Callback needed",
  ];
  const smsText = `
[LEAD AI${
    headerOutcomes.includes(outcome as string)
      ? " - " + (outcome as string).toUpperCase()
      : ""
  }]

Hi, This is Your AI agent. I received a call from ${
    callerNumber ?? "Unknown number"
  } at ${nowFormattedUTC}.

Summary: ${summary}
Outcome: ${outcome ?? "Empty outcome"}

(Powered by LeadAI)
`;
  return smsText;
};
