import { setUserTier } from '../lib/storage.js';

document.addEventListener('DOMContentLoaded', () => {
  const upgradeBtn = document.getElementById('upgradeBtn');

  upgradeBtn.addEventListener('click', async () => {
    await setUserTier('premium');
    upgradeBtn.textContent = 'Upgraded! 💎';
    upgradeBtn.style.background = 'linear-gradient(90deg, #10b981 0%, #059669 100%)';
    upgradeBtn.disabled = true;
    
    // Add success message
    const promoBox = document.querySelector('.promo-box');
    const successMsg = document.createElement('div');
    successMsg.style.color = '#10b981';
    successMsg.style.fontSize = '14px';
    successMsg.style.fontWeight = '600';
    successMsg.style.marginTop = '16px';
    successMsg.style.textAlign = 'center';
    successMsg.textContent = 'Premium tier activated successfully! You can close this tab and start using PromptIQ.';
    promoBox.parentNode.insertBefore(successMsg, promoBox.nextSibling);
  });
});
