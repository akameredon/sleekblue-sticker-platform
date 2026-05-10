/**
 * CLI Conversation Simulator
 * QA Agent tool — replays synthetic customer conversations end-to-end.
 *
 * Usage:
 *   npx tsx scripts/simulateConversation.ts --scenario=business-branding
 *
 * Scenarios:
 *   business-branding | packaging | personal-no-design | reselling-bulk | returning-customer
 */

import { classifyIntent } from '../modules/intent-engine/classifier.js';
import { getOrCreateSession, saveSession } from '../modules/conversation-flow/sessionStore.js';
import { getNextQuestion, recordAnswer, isDiagnosisComplete } from '../modules/conversation-flow/questionEngine.js';
import { buildOffer } from '../modules/offer-builder/offerGenerator.js';
import { buildDecisionLockMessage, isConfirmation } from '../modules/conversation-flow/decisionLock.js';
import { applyTransition, type Session } from '../modules/conversation-flow/stateMachine.js';
import { trackEvent } from '../modules/behavioral-engine/dropoffTracker.js';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type Scenario = {
  name: string;
  phoneNumber: string;
  messages: string[];
};

const SCENARIOS: Record<string, Scenario> = {
  'business-branding': {
    name: 'Business Branding — Clean Path',
    phoneNumber: '+2348001234501',
    messages: ['Hi', '1', '500', 'Yes', 'Under ₦80k', 'Lock it in'],
  },
  'packaging': {
    name: 'Packaging Labels',
    phoneNumber: '+2348001234502',
    messages: ['Hello', 'Packaging', '2000', 'Yes', 'Round', '₦50k–₦100k', 'Confirm'],
  },
  'personal-no-design': {
    name: 'Personal Use — No Design',
    phoneNumber: '+2348001234503',
    messages: ['Hi there', 'Personal use', '100', 'Create for me', 'Under ₦30k'],
  },
  'reselling-bulk': {
    name: 'Reselling — Large Volume',
    phoneNumber: '+2348001234504',
    messages: ['Good day', '4', '5000', 'Have design', 'Recurring supply deal', 'Best price', '2 weeks'],
  },
};

async function runScenario(scenario: Scenario): Promise<void> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🎬 SCENARIO: ${scenario.name}`);
  console.log(`📱 Phone: ${scenario.phoneNumber}`);
  console.log('='.repeat(60));

  let session = getOrCreateSession(scenario.phoneNumber);
  trackEvent(session.phoneNumber, scenario.phoneNumber, 'STATE_ENTERED', { stateTo: 'ENTRY' });

  for (const message of scenario.messages) {
    console.log(`\n👤 Customer: "${message}"`);

    if (session.state === 'ENTRY') {
      const intent = await classifyIntent(message, openai);
      session.intent = intent.intent;
      session = applyTransition(session, 'INTENT_DETECTED');
      trackEvent(session.phoneNumber, scenario.phoneNumber, 'STATE_ENTERED', {
        stateFrom: 'ENTRY',
        stateTo: 'DIAGNOSIS',
        intent: intent.intent,
      });
      console.log(`🤖 Bot: [Detected intent: ${intent.intent} (${(intent.confidence * 100).toFixed(0)}% confidence)]`);
      const firstQ = getNextQuestion(session);
      if (firstQ) console.log(`🤖 Bot: ${firstQ.text}`);
      saveSession(session);
      continue;
    }

    if (session.state === 'DIAGNOSIS') {
      const currentQ = getNextQuestion(session);
      if (currentQ) {
        session = recordAnswer(session, currentQ.key, message);
        const nextQ = getNextQuestion(session);

        if (!nextQ || isDiagnosisComplete(session)) {
          const answers = {
            intent: session.intent!,
            quantity: parseInt(String(session.answers.quantity ?? '100').replace(/[^0-9]/g, ''), 10) || 100,
            hasDesign: String(session.answers.hasDesign ?? 'yes').toLowerCase().includes('yes'),
            budgetRange: String(session.answers.budget ?? 'Under ₦50k'),
          };
          const offer = buildOffer(answers);
          session.offer = offer;
          session = applyTransition(session, 'OFFER_READY');
          console.log(`🤖 Bot:\n${offer.messageFormatted}`);
          session = applyTransition(session, 'PROOF_SENT');
          console.log(`🤖 Bot: [Sending 2 proof images matching ${session.intent}]`);
          session = applyTransition(session, 'CUSTOMER_CONFIRMED');
          console.log(`🤖 Bot: ${buildDecisionLockMessage(offer)}`);
          trackEvent(session.phoneNumber, scenario.phoneNumber, 'OFFER_SENT', { intent: session.intent });
        } else {
          console.log(`🤖 Bot: ${nextQ.text}`);
        }
        saveSession(session);
      }
      continue;
    }

    if (session.state === 'DECISION') {
      if (isConfirmation(message)) {
        session = applyTransition(session, 'CUSTOMER_CONFIRMED');
        console.log(`🤖 Bot: [Generating payment link...] ✅`);
        trackEvent(session.phoneNumber, scenario.phoneNumber, 'PAYMENT_LINK_SENT');
        console.log(`🤖 Bot: ✅ Your order is reserved! Pay here: https://paystack.com/pay/cde-demo`);
        saveSession(session);
      } else {
        console.log(`🤖 Bot: Sure! What quantity did you have in mind?`);
      }
      continue;
    }

    console.log(`🤖 Bot: [${session.state} state — message received]`);
  }

  console.log(`\n✅ Final state: ${session.state}`);
  console.log(`📊 Answers collected: ${JSON.stringify(session.answers, null, 2)}`);
  if (session.offer) {
    console.log(`💰 Offer price: ₦${session.offer.priceNaira.toLocaleString()}`);
    console.log(`⚠️  Price sanity check: ${session.offer.priceNaira > 0 ? 'PASS ✅' : 'FAIL ❌'}`);
  }
}

async function main(): Promise<void> {
  const arg = process.argv.find((a) => a.startsWith('--scenario='));
  const scenarioKey = arg?.split('=')[1] ?? 'business-branding';
  const scenario = SCENARIOS[scenarioKey];

  if (!scenario) {
    console.error(`Unknown scenario: ${scenarioKey}`);
    console.error(`Available: ${Object.keys(SCENARIOS).join(', ')}`);
    process.exit(1);
  }

  await runScenario(scenario);
  console.log('\n🏁 Simulation complete.\n');
}

main().catch(console.error);
