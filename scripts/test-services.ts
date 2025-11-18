import { TextractClient } from '@aws-sdk/client-textract';
import Anthropic from '@anthropic-ai/sdk';

async function testAWS() {
  console.log('\n🔍 Test AWS Textract...');

  try {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      throw new Error('AWS credentials manquantes dans .env');
    }

    const client = new TextractClient({
      region: process.env.AWS_REGION || 'eu-west-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    console.log('   ✅ AWS Textract configuré');
    console.log(`   - Region: ${process.env.AWS_REGION || 'eu-west-1'}`);
    console.log(`   - Access Key: ${process.env.AWS_ACCESS_KEY_ID.substring(0, 8)}...`);
    return true;
  } catch (error: any) {
    console.error('   ❌ Erreur AWS:', error.message);
    return false;
  }
}

async function testClaude() {
  console.log('\n🤖 Test Anthropic Claude...');

  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY manquante dans .env');
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    console.log('   - Test de connexion...');

    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 50,
      messages: [{
        role: 'user',
        content: 'Réponds juste "OK" si tu me reçois.'
      }],
    });

    const response = message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    console.log('   ✅ Claude AI connecté');
    console.log(`   - Modèle: claude-3-5-haiku-20241022`);
    console.log(`   - Réponse: "${response}"`);
    return true;
  } catch (error: any) {
    console.error('   ❌ Erreur Claude:', error.message);
    return false;
  }
}

async function main() {
  console.log('🧪 TEST DES SERVICES CLOUD\n');
  console.log('═'.repeat(50));

  const awsOk = await testAWS();
  const claudeOk = await testClaude();

  console.log('\n' + '═'.repeat(50));
  console.log('\n📊 RÉSULTATS :');
  console.log(`   AWS Textract: ${awsOk ? '✅ OK' : '❌ ÉCHEC'}`);
  console.log(`   Claude AI: ${claudeOk ? '✅ OK' : '❌ ÉCHEC'}`);

  if (awsOk && claudeOk) {
    console.log('\n🎉 Tous les services sont opérationnels !');
    console.log('\n✅ Tu peux maintenant :');
    console.log('   1. Uploader une vraie facture PDF');
    console.log('   2. Le système utilisera AWS Textract pour l\'OCR');
    console.log('   3. Puis Claude pour générer les écritures');
    console.log('   4. Export automatique vers Sage 50');
  } else {
    console.log('\n⚠️  Certains services ne sont pas configurés.');
    console.log('Vérifie ton fichier .env');
  }
}

main();
