// import { lookup } from "dns"
// import { callbackify } from "util"

// Step 0: Init the ReAct variables like accumulateEvidence, loopIndex,...
// For loop begin:
//     Step 1: Call the planner to get the action plan list (which capability to call, with what parameters)
//     Step 2: Execute the plan and get the contextual data (call the capability and get the result)
//     step 3: Reflect on the result, accumulate evidence, and decide whether to continue (needMore) the loop or not
//         if continue (needMore = false), go back to step 1 with the updated evidence and next prompt to know what to focus on
//         else, break the lookup
// For loop end
// Step 4: Call the LLM to compose the answer with the accumulated evidence