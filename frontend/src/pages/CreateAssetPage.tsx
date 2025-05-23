import { Card, Text, Box, Flex } from '@radix-ui/themes';
import { EncryptedUpload } from '../components/upload/EncryptedUpload';

export function CreateAssetPage() {
  return (
    <Box style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <Flex align="center" justify="center" style={{ width: '100%' }}>
        <Card style={{ maxWidth: 520, width: '100%', boxShadow: '0 4px 32px var(--color-primary-glow)', borderRadius: 'var(--radius)', padding: '2.5rem 2rem', background: 'var(--color-card)' }}>
          <Flex direction="column" align="center" justify="center" style={{ width: '100%' }}>
            <Text size="7" weight="bold" mb="1" style={{ color: 'var(--color-primary)', textShadow: '0 2px 16px var(--color-primary-glow)', textAlign: 'center', width: '100%' }}>Create New Asset</Text>
            <EncryptedUpload showAssetList={false} />
          </Flex>
        </Card>
      </Flex>
    </Box>
  );
} 