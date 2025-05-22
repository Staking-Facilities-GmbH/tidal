import { Card, Text, Box } from '@radix-ui/themes';
import { EncryptedUpload } from '../components/upload/EncryptedUpload';

export function CreateAssetPage() {
  return (
    <Box>
      <Card>
        <Text size="5" weight="bold" mb="4">Create New Asset</Text>
        <EncryptedUpload showAssetList={false} />
      </Card>
    </Box>
  );
} 