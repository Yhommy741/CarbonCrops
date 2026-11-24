#pragma once
// =============================================================================
//  LoRaConfig.h — radio settings that sensor nodes and gateway must share
// =============================================================================
#include <stdint.h>

// ---- EBYTE E220-900T22D frequency -------------------------------------------
//   frequency [MHz] = 850.125 + channel     (channel 0-80 -> 850.125-930.125)
//
// Thailand (NBTC) LoRa band: 920-925 MHz -> channels 70-74.
// Factory default is channel 18 (868.125 MHz), which is NOT allowed in Thailand.
#define E220_BASE_FREQ_MHZ  850.125f
#define E220_CHANNEL        72         // 922.125 MHz

static_assert(E220_CHANNEL >= 70 && E220_CHANNEL <= 74,
              "E220 channel must stay inside the Thai 920-925 MHz band");
