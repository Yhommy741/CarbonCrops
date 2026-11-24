#pragma once
// =============================================================================
//  PipeConfig.h — installation of the AWD pipe the sensor looks down into
//
//          ┌──────────┐  <- sensor face
//          │  sensor  │
//          └────┬─────┘
//               │   ▲                 ▲
//               │   │ measured        │
//               │   │ distance        │ PIPE_SENSOR_TO_GROUND_CM
//         ~~~~~~│~~~▼~~~ water        │
//   ────────────┼─────────────────────▼──── ground (soil surface) = 0 cm
//               │  pipe (perforated below ground)
//               │
//
//   water level [cm] = PIPE_SENSOR_TO_GROUND_CM - measured distance
//     > 0  water above the ground (field flooded)
//     < 0  water below the ground, inside the pipe (e.g. -15 cm = "dry, irrigate")
//
//  Measure PIPE_SENSOR_TO_GROUND_CM with a ruler after installing the pipe:
//  from the sensor face straight down to the soil surface beside the pipe.
// =============================================================================

// Sensor face to the soil surface [cm]
#define PIPE_SENSOR_TO_GROUND_CM  50.0f

static_assert(PIPE_SENSOR_TO_GROUND_CM > 0.0f, "PIPE_SENSOR_TO_GROUND_CM must be > 0");
