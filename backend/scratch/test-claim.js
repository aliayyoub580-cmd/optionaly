const { query, transaction } = require('../src/helpers/db');
const { v4: uuidv4 } = require('uuid');

async function testClaim() {
  const id = 'fc74a28e-15ef-43e1-b0a0-8ffef0102103';
  const userId = '8bbb2a49-77f7-4207-a209-10b93d67e91a';
  const bonuses = await query('SELECT * FROM referral_deposit_bonuses WHERE id=? LIMIT 1', [id]);
  const bonus = bonuses[0];
  console.log('Bonus found:', bonus);
  try {
    await transaction(async (tx) => {
      await tx.query("UPDATE referral_deposit_bonuses SET status='claimed', claimedAt=UTC_TIMESTAMP(), updatedAt=UTC_TIMESTAMP() WHERE id=?", [id]);
      await tx.query("UPDATE users SET balance=balance+?, realBalance=realBalance+?, updatedAt=UTC_TIMESTAMP() WHERE id=?", [bonus.bonusAmount, bonus.bonusAmount, userId]);
      await tx.query("INSERT INTO activities (id,userId,type,message,amount,createdAt,updatedAt) VALUES (?,?,'bonus_received',?,?,UTC_TIMESTAMP(),UTC_TIMESTAMP())", [uuidv4(), userId, 'Claimed bonus', bonus.bonusAmount]);
    });
    console.log('Transaction succeeded!');
  } catch(e) {
    console.error('Transaction error:', e);
  }
}

testClaim().then(() => process.exit(0));
