from livekit import api


async def setup_dispatch_rule():
    lkapi = api.LiveKitAPI()
    try:
        # Check for existing rules first to avoid duplicates
        try:
            existing_rules = await lkapi.sip.list_sip_dispatch_rule(api.ListSIPDispatchRuleRequest())
            # Check if a rule with the desired configuration already exists
            print(f"Existing rules: {existing_rules.items}")
            print(f"Existing rules length: {type(existing_rules)}")
            if len(existing_rules.items) == 1:
                print("Using existing dispatch rule")
                return existing_rules.items[0]
            else:
                for rule in existing_rules.items:
                    if hasattr(rule, 'dispatch_rule_individual') and rule.dispatch_rule_individual.room_prefix == "call-":
                        print("Using existing dispatch rule")
                        return rule
        except Exception as e:
            print(f"Error checking existing dispatch rules: {str(e)}")
            # Continue to create a new rule
        print("Creating new dispatch rule")
        request = api.CreateSIPDispatchRuleRequest(
            rule=api.SIPDispatchRule(
                dispatch_rule_individual=api.SIPDispatchRuleIndividual(
                    room_prefix="call-",
                )
            ),
            room_config=api.RoomConfiguration(
                agents=[api.RoomAgentDispatch(
                    agent_name="inbound-agent",
                    metadata="job dispatch metadata",
                )]
            )
        )
        dispatch = await lkapi.sip.create_sip_dispatch_rule(request)
        print("Created new dispatch rule:", dispatch)
        return dispatch
    except Exception as e:
        print(f"Error in setup_dispatch_rule: {str(e)}")
        return None
    finally:
        await lkapi.aclose()