import { sendMessage } from '../telegram.js'

const HELP_TEXT = `👋 Hoy boss! Ito ang magagawa ko:

<b>Mga command:</b>
/summary — today + this month na income/expenses
/events — upcoming events (next 30 days)
/booking &lt;pangalan o code&gt; — hanapin ang booking

<b>Log ng expense</b> — type mo lang:
<i>Diesel 1500</i>
<i>Food 12000 SS-032</i> (may booking ref)

<b>Log ng bayad</b> — type mo lang:
<i>Bayad Maria 15000</i>

Magtatanong ako kung kulang o hindi malinaw, tapos magpapa-confirm bago ko i-save. 👍`

export async function help(chatId) {
  await sendMessage({ chat_id: chatId, text: HELP_TEXT })
}
