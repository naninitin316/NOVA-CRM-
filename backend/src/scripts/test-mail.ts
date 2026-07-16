import 'dotenv/config';
import { mailService } from '../services/mail.service';

async function main() {
  const to = process.env.MAIL_TEST_TO || process.argv[2];
  if (!to) {
    throw new Error('Provide a recipient: MAIL_TEST_TO=user@example.com npm run mail:test');
  }

  console.log('SMTP status:', mailService.getPublicStatus());
  await mailService.verify();
  const result = await mailService.sendTestEmail(to);
  console.log('Test mail result:', result);
}

main()
  .catch((error) => {
    console.error('[Mail test] Failed.');
    console.error(error);
    process.exit(1);
  });
