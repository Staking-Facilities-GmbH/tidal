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
          <Text as="div" size="9" weight="bold" style={{ letterSpacing: '0.04em', marginBottom: 16, textAlign: 'left', lineHeight: 1.1 }}>
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
          <Button size="4" style={{ background: 'linear-gradient(90deg, #137DFA,rgb(77, 163, 197))', color: '#fff', fontWeight: 700, borderRadius: 32, padding: '0 2.5rem', marginBottom: 40 }} onClick={() => {
            window.location.href = '/marketplace';
          }}>
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
        <Text as="div" size="9" weight="bold" align="center" mb="8">Explore <span style={{
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
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '32px',
            justifyContent: 'center',
            alignItems: 'stretch',
          }}>
            {tagGroups.slice(0, 3).map(group => (
              <div
                key={group.tag}
                style={{
                  background: 'rgba(30, 32, 60, 0.92)',
                  borderRadius: 18,
                  boxShadow: '0 2px 16px #137dfa33',
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 280,
                  transition: 'transform 0.15s, box-shadow 0.15s',
                  cursor: 'pointer',
                  position: 'relative',
                  border: '1.5px solid rgba(19,125,250,0.08)',
                }}
                onMouseOver={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px) scale(1.025)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 32px #137dfa55';
                }}
                onMouseOut={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = '';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 16px #137dfa33';
                }}
              >
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gridTemplateRows: '1fr 1fr',
                  gap: 8,
                  marginBottom: 18,
                  minHeight: 120,
                }}>
                  {[0,1,2,3].map(i => {
                    const a = group.assets[i];
                    return (
                      <div key={a ? a.id : i} style={{
                        background: 'rgba(20,24,34,0.7)',
                        borderRadius: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: 60,
                        minWidth: 60,
                        aspectRatio: '1/1',
                        overflow: 'hidden',
                        border: '1px solid rgba(19,125,250,0.07)',
                      }}>
                        {a && (a.preview_gif_url || a.image_url) ? (
                          <img
                            src={a.preview_gif_url || a.image_url}
                            alt={a.name}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'contain',
                              background: '#181c2a',
                              borderRadius: 10,
                              display: 'block',
                            }}
                            onError={e => {
                              (e.currentTarget as HTMLImageElement).src = '/explore1.jpg';
                            }}
                          />
                        ) : (
                          <span style={{ color: '#8a8fa3', fontSize: 18 }}>—</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 'auto',
                  paddingTop: 8,
                }}>
                  <span style={{ fontWeight: 700, fontSize: 20, color: '#fff', letterSpacing: 0.5 }}>{group.tag}</span>
                  <span style={{
                    background: 'linear-gradient(90deg, #137DFA 0%, #00eaff 100%)',
                    color: '#fff',
                    borderRadius: 12,
                    fontSize: 14,
                    fontWeight: 600,
                    padding: '4px 16px',
                    marginLeft: 8,
                    boxShadow: '0 2px 8px #00eaff33',
                    display: 'inline-block',
                  }}>{group.assets.length} Items</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Box>
    </Box>
  );
} 