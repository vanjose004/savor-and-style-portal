import { sendMessage } from '../telegram.js'

const HELP_TEXT = `👋 Hoy boss! Ito ang magagawa ko:

<b>Commands:</b>
/summary — today + this month na income/expenses
/events — upcoming events (next 30 days)
/booking &lt;pangalan o code&gt; — hanapin ang booking

<b>Mag-log ng expense</b> — type mo lang:
<i>Diesel 1500</i>
<i>Food 12000 SS-032</i> (may booking ref)

<b>Mag-log ng bayad</b> — type mo lang:
<i>Bayad Maria 15000</i>

<b>Tanungin mo ako — pera/income/expenses:</b>
<i>Meron pa ba?</i> / <i>Magkano pera ko?</i> — cash on hand
<i>Magkano utang ko?</i> — utang mo sa iba
<i>Magkano na nakuha natin?</i> — income this month
<i>Magkano nagastos?</i> — expenses this month

<b>Tanungin mo ako — bookings/events:</b>
<i>May event ba bukas?</i> / <i>May event July 20?</i>
<i>Sino may event ngayon?</i>
<i>Anong events ngayong linggo?</i>
<i>May event ba sa August?</i>
<i>Pending bookings?</i> / <i>Confirmed bookings?</i>
<i>Ilang booking ngayong buwan?</i>
<i>Ilang events total?</i>
<i>Sino hindi pa nakakabayad?</i>
<i>Si Maria bayad na ba?</i>
<i>Magkano pa kulang ni Maria?</i>
<i>Ano status ni Maria?</i>

Magtatanong ako kung kulang o hindi malinaw yung expense/bayad mo, tapos magpapa-confirm bago ko i-save. Basta query lang (hindi mag-lolog), sagot agad. 👍`

export async function help(chatId) {
  await sendMessage({ chat_id: chatId, text: HELP_TEXT })
}
