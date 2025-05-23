import React, { useEffect, useState } from 'react';
import { Box, Flex, Card, Text, Button, Avatar } from '@radix-ui/themes';
import { supabase } from '../utils/supabase';


export function LandingPage() {
  const [exploreAssets, setExploreAssets] = useState<any[]>([]);
  const [exploreLoading, setExploreLoading] = useState(false);
  const [tagGroups, setTagGroups] = useState<{ tag: string, assets: any[] }[]>([]);

  useEffect(() => {
    const fetchAssets = async () => {
      setExploreLoading(true);
      const { data, error } = await supabase.from('assets').select('*');
      const assets = error ? [] : data || [];
      setExploreAssets(assets);
      // Group by tag
      const tagMap: { [tag: string]: any[] } = {};
      assets.forEach(asset => {
        (asset.tags || []).forEach((tag: string) => {
          if (!tagMap[tag]) tagMap[tag] = [];
          tagMap[tag].push(asset);
        });
      });
      const groups = Object.entries(tagMap)
        .sort((a, b) => b[1].length - a[1].length) // most items first
        .map(([tag, assets]) => ({ tag, assets }));
      setTagGroups(groups);
      setExploreLoading(false);
    };
    fetchAssets();
  }, []);

  return (
    <Box className="landing-root" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px', minHeight: '100vh' }}>
      {/* Hero Section - Responsive */}
      <Flex className="landing-hero" p="8" style={{ minHeight: 420, alignItems: 'center', justifyContent: 'center', gap: 64, flexWrap: 'wrap', flexDirection: 'row' }}>
        {/* Left Side: Text & Stats */}
        <Box style={{ flex: 1, maxWidth: 520, minWidth: 280, marginBottom: 32 }}>
          <Text as="div" size="8" weight="bold" style={{ letterSpacing: '0.04em', marginBottom: 16, textAlign: 'left', lineHeight: 1.1 }}>
            THE <br />
            NEW  <span style={{
              background: 'linear-gradient(0deg, #137DFA 0%, #00eaff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              color: 'transparent',
              display: 'inline-block',
            }}> WAVE</span> <br />
            IS HERE <br />
          </Text>
          <Text as="p" size="4" style={{ color: '#b0b3c6', marginBottom: 32, textAlign: 'left' }}>
            Truly Own Your In-Game Digital Assets and Share it With The World
          </Text>
          <Button size="4" style={{ background: 'linear-gradient(90deg, #7b2ff2, #f357a8)', color: '#fff', fontWeight: 700, borderRadius: 32, padding: '0 2.5rem', marginBottom: 40 }}>
            Explore Now
          </Button>
          <Flex gap="8" mt="6" align="center">
            <Box style={{ textAlign: 'left' }}>
              <Text size="7" weight="bold"><span style={{
              background: 'linear-gradient(0deg, #137DFA 0%, #00eaff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              color: 'transparent',
              display: 'inline-block',
            }}>12k</span></Text>
              <Text size="3" style={{ color: '#FFFFFF', display: 'block' }}>Collectibles</Text>
            </Box>
            <Box style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.15)', borderRadius: 1 }} />
            <Box style={{ textAlign: 'left' }}>
              <Text size="7" weight="bold"><span style={{
              background: 'linear-gradient(0deg, #137DFA 0%, #00eaff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              color: 'transparent',
              display: 'inline-block',
            }}>36k</span></Text>
              <Text size="3" style={{ color: '#FFFFFF', display: 'block' }}>Auctions</Text>
            </Box>
            <Box style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.15)', borderRadius: 1 }} />
            <Box style={{ textAlign: 'left' }}>
            <Text size="7" weight="bold"><span style={{
              background: 'linear-gradient(0deg, #137DFA 0%, #00eaff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              color: 'transparent',
              display: 'inline-block',
            }}>57k</span></Text>
              <Text size="3" style={{ color: '#FFFFFF', display: 'block' }}>NFT Artist</Text>
            </Box>
          </Flex>
        </Box>
        {/* Right Side: Featured NFT Card */}
        <Box style={{ flex: 1, minWidth: 320, display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
          <Card className="neon-breath" style={{
            background: 'rgba(30, 32, 60, 0.95)',
            borderRadius: 24,
            minWidth: 280,
            maxWidth: 360,
            width: '100%',
            padding: 0,
            overflow: 'hidden',
            position: 'relative',
          }}>
            <Box style={{ position: 'relative', width: '100%', height: 280 }}>
              <img src="/images/character.png" alt="Abstract Painting" style={{ width: '100%', height: '100%', objectFit: 'cover', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }} />
              <Box style={{
                position: 'absolute',
                bottom: 16,
                left: 16,
                right: 16,
              }}>
                <Text weight="bold" size="5" style={{ color: '#fff', display: 'block', marginBottom: 4 }}>Shadowbyte</Text>
                <Flex align="center" gap="2">
                  <Text size="2" style={{ color: '#e0e0e0' }}>0x432....5235</Text>
                </Flex>
              </Box>
            </Box>
            <Flex p="3" align="center" justify="between" style={{ background: 'rgba(20, 22, 40, 0.8)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <Box style={{ textAlign: 'center', flex: 1, padding: '8px 0' }}>
                <Text size="2" style={{ color: '#b0b3c6', display: 'block', marginBottom: '2px' }}>Current Price</Text>
                <Text size="4" weight="bold" style={{ color: '#fff' }}>6.78 SUI</Text>
              </Box>
              <Box style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center', flex: 1, padding: '8px 0'  }}>
                <Text size="4" weight="bold" style={{ color: '#fff' }}>12</Text>
                <Text size="1" style={{ color: '#b0b3c6', display: 'block' }}>Hours</Text>
              </Box>
              <Box style={{ textAlign: 'center', flex: 1, padding: '8px 0'  }}>
                <Text size="4" weight="bold" style={{ color: '#fff' }}>58</Text>
                <Text size="1" style={{ color: '#b0b3c6', display: 'block' }}>Minutes</Text>
              </Box>
            </Flex>
          </Card>
        </Box>
      </Flex>

      {/* Partner Marquee */}
      <Box style={{
        width: '100%',
        padding: '18px 0',
        margin: '32px 0 60px 0',
        background: 'linear-gradient(90deg, #2a2a72 0%,rgb(19, 102, 150) 100%)',
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
        minHeight: 56,
        display: 'flex',
        alignItems: 'center',
      }}>
        {/* Left fade overlay */}
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 160,
          pointerEvents: 'none',
          background: 'linear-gradient(90deg, #111113 10%, rgba(2,0,28,0) 100%)',
          zIndex: 2,
        }} />
        {/* Right fade overlay */}
        <div style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: 160,
          pointerEvents: 'none',
          background: 'linear-gradient(270deg, #111113 10%, rgba(2,0,28,0) 100%)',
          zIndex: 2,
        }} />
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 48,
          whiteSpace: 'nowrap',
          animation: 'marquee-scroll 18s linear infinite',
        }}>
          {['sui','walrus','seal','sui','walrus','seal','sui','walrus','seal'].map((p, i) => (
            <img
              key={p}
              src={`/images/partners/${p}.png`}
              alt={p}
              style={{
                height: 32,
                filter: 'brightness(1.1)',
                opacity: 0.95,
                paddingTop: p === 'seal' ? 4 : 0,
              }}
            />
          ))}
          {['sui','walrus','seal','sui','walrus','seal','sui','walrus','seal'].map((p, i) => (
            <img
              key={p+'-2'}
              src={`/images/partners/${p}.png`}
              alt={p}
              style={{
                height: 32,
                filter: 'brightness(1.1)',
                opacity: 0.95,
                paddingTop: p === 'seal' ? 4 : 0,
              }}
            />
          ))}
        </div>
      </Box>


      {/* Explore Assets */}
      <Box mt="8" mb="8" style={{ maxWidth: 1100, margin: '0 auto', padding: '0 8px' }}>
        <Text as="div" size="8" weight="bold" align="center" mb="4">Explore <span style={{
              background: 'linear-gradient(0deg, #137DFA 0%, #00eaff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              color: 'transparent',
              display: 'inline-block',
            }}>Assets</span></Text>
        {exploreLoading ? (
          <Text align="center">Loading artworks...</Text>
        ) : (
          <Flex justify="center" gap="4" wrap="wrap">
            {tagGroups.slice(0, 5).map(group => (
              <Card key={group.tag} style={{ background: 'rgba(30, 32, 60, 0.8)', minWidth: 260, maxWidth: 320, textAlign: 'left', margin: 8, flex: '1 1 260px', borderRadius: 18, overflow: 'hidden', position: 'relative', boxShadow: '0 2px 16px #137dfa33' }}>
                <Flex direction="column" style={{ height: 180, gap: 0, marginBottom: 8 }}>
                  <Flex style={{ flex: 1, gap: 2 }}>
                    {group.assets.slice(0, 2).map((a, i) => (
                      <img key={a.id + '-top'} src={a.preview_gif_url || a.image_url || '/explore1.jpg'} alt={a.name} style={{ width: '50%', height: 60, objectFit: 'cover', borderRadius: i === 0 ? '12px 0 0 0' : '0 12px 0 0' }} />
                    ))}
                  </Flex>
                  <Flex style={{ flex: 1, gap: 2 }}>
                    {group.assets.slice(2, 4).map((a, i) => (
                      <img key={a.id + '-bot'} src={a.preview_gif_url || a.image_url || '/explore2.jpg'} alt={a.name} style={{ width: '50%', height: 60, objectFit: 'cover', borderRadius: i === 0 ? '0 0 0 12px' : '0 0 12px 0' }} />
                    ))}
                  </Flex>
                </Flex>
                <Flex align="center" justify="between" style={{ padding: '0 12px 8px 12px' }}>
                  <Text weight="bold" size="4">{group.tag}</Text>
                  <Box style={{ background: 'linear-gradient(90deg, #137DFA 0%, #00eaff 100%)', color: '#fff', borderRadius: 8, fontSize: 14, fontWeight: 600, padding: '2px 12px', marginLeft: 8 }}>
                    {group.assets.length} Items
                  </Box>
                </Flex>
              </Card>
            ))}
          </Flex>
        )}
      </Box>
    </Box>
  );
} 