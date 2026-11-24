#include "Gps.h"

#include "NodeConfig.h"

void gpsBegin() {
    // Placeholder: nothing to start until a GPS module is added
}

bool gpsRead(GpsFix &fix) {
    // Placeholder: fixed position from NodeConfig.h
    fix.latitude  = NODE_LATITUDE;
    fix.longitude = NODE_LONGITUDE;
    fix.valid     = true;
    return fix.valid;
}
