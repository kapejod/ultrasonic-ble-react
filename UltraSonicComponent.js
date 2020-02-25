import React, { Component } from 'react';
import { ActivityIndicator, Platform, View, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors } from 'react-native/Libraries/NewAppScreen';
import { BleManager } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import { PermissionsAndroid } from 'react-native';

const styles = StyleSheet.create({
  scrollView: {
    backgroundColor: Colors.lighter,
  },
  engine: {
    position: 'absolute',
    right: 0,
  },
  body: {
    backgroundColor: Colors.white,
  },
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.black,
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
    color: Colors.dark,
  },
  highlight: {
    fontWeight: '700',
  },
  footer: {
    color: Colors.dark,
    fontSize: 12,
    fontWeight: '600',
    padding: 4,
    paddingRight: 12,
    textAlign: 'right',
  },
});


export default class UltraSonicComponent extends React.Component {
  constructor(props) {
    super(props)
    this.manager = new BleManager();
    this.state = {
      isConnected: false,
      deviceId: null,
      values: {}
    };
  }

  UNSAFE_componentWillMount() {
    if (Platform.OS === 'ios') {
      this.manager.onStateChange((state) => {
        if (state === 'PoweredOn') this.scanAndConnect()
      })
    } else if (Platform.OS === 'android') {
      this.requestAndroidPermission();
    }
  }

  requestAndroidPermission() {
    try {
      const granted = PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        {
          title: 'Coarse Location Permission',
          message:
          'UltraSonicTest App needs location access to discover BLE devices around you.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      ).then((granted) => {
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Permission ok, go.');
          this.scanAndConnect()
        } else {
          console.log('Permission denied, no wind data for you!');
        }
      })
    } catch (err) {
      console.warn(err);
    }
  }

  scanAndConnect() {
    this.manager.startDeviceScan(
      null,
      null,
      (error, device) => {
        if (error) {
          console.log(error);
          return
        }

        if (device.name === 'ULTRASONIC') {
          console.log('found device: ' + device.name, device.id);
          // TODO: select by device.id, because there might be more than one wind sensor in close proximity
          this.setState({
            deviceId: device.id
          });
          this.manager.stopDeviceScan()
          device.connect()
          .then((device) => {
            return device.discoverAllServicesAndCharacteristics()
          })
          .then((device) => {
            return this.subscribe(device)
          })
          .then(() => {
            // receiving sensor data
            this.setState({ isConnected: true });
          }, (error) => {
            console.log(error.message);
          })
        }
      });
    }

    async subscribe(device) {
      const service = '180d';

      // enable the IMU to receive roll, pitch and eCompass
      const characteristic = await device.writeCharacteristicWithResponseForService(
        service, '0000a003-0000-1000-8000-00805f9b34fb', Buffer.from([0x01]).toString('base64')
      );

      // configure data rate [Hz], valid rates are 0x01, 0x04 and 0x8
      await device.writeCharacteristicWithResponseForService(
        service, '0000a002-0000-1000-8000-00805f9b34fb', Buffer.from([0x01]).toString('base64')
      );

      // subscribe for the actual sensor data
      device.monitorCharacteristicForService(service, '2a39', (error, characteristic) => {
        if (error) {
          console.log(error.message);
          return
        }
        const buffer =  Buffer.from(characteristic.value, 'base64')
        if (buffer.length >= 10) {
          const batteryLevel = buffer.readUInt8(4) * 10.0;
          const windSpeed = buffer.readUInt16LE(0) / 100.0;
          const windDirection = buffer.readUInt16LE(2);
          const temperature = buffer.readUInt8(5) - 100.0;
          const roll = buffer.readUInt8(6) - 90.0;
          const pitch = buffer.readUInt8(7) - 90.0;
          const eCompass = 360.0 - buffer.readUInt16LE(8);

          this.setState({
            values: {
              batteryLevel: batteryLevel,
              windSpeed: windSpeed,
              windDirection: windDirection,
              temperature: temperature,
              roll: roll,
              pitch: pitch,
              eCompass: eCompass
            }
          });

          console.log('batteryLevel [%]: ' + batteryLevel);
          console.log('windSpeed [m/s]: ' + windSpeed);
          console.log('windDirection [°]: ' + windDirection);
          console.log('temperature [°C]: ' + temperature);
          console.log('roll [°]: ' + roll);
          console.log('pitch [°]: ' + pitch);
          console.log('eCompass [°]: ' + eCompass);
        }
      })
    }

  render() {
    if (this.state.isConnected) {
      return (
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          style={styles.scrollView}>
          <View style={styles.body}>
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>UltraSonic Test app</Text>
              <Text style={styles.sectionDescription}>
              This app will connect to a Calypso UltraSonic device via BLE and display sensor data.
              </Text>
              <Text style={styles.sectionTitle}>Device: {this.state.deviceId}</Text>

              <Text style={styles.sectionDescription}>batteryLevel [%]: {this.state.values.batteryLevel}</Text>
              <Text style={styles.sectionDescription}>windSpeed [m/s]: {this.state.values.windSpeed}</Text>
              <Text style={styles.sectionDescription}>windDirection [°]: {this.state.values.windDirection}</Text>
              <Text style={styles.sectionDescription}>temperature [°C]: {this.state.values.temperature}</Text>
              <Text style={styles.sectionDescription}>roll [°]: {this.state.values.roll}</Text>
              <Text style={styles.sectionDescription}>pitch [°]: {this.state.values.pitch}</Text>
              <Text style={styles.sectionDescription}>eCompass [°]: {this.state.values.eCompass}</Text>
            </View>
          </View>
        </ScrollView>
      );
    } else {
      return (
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          style={styles.scrollView}>
          <View style={styles.body}>
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Searching for wind sensor...</Text>
              <ActivityIndicator size="large" color="#0000ff" />
            </View>
          </View>
        </ScrollView>
      )
    }
  }
}
