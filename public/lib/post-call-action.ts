export const extractPostCallAction = (
  postCallActionSetup: Record<string, unknown>[]
) => {
  return (postCallActionSetup ?? []).reduce(
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
};
