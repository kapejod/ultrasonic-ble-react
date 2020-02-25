/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow
 */

import React, { Component } from 'react';
import { SafeAreaView, StatusBar } from 'react-native';
import { Colors } from 'react-native/Libraries/NewAppScreen';
import UltraSonicComponent from './UltraSonicComponent';

const App: () => React$Node = () => {
    return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView>
        <UltraSonicComponent />
      </SafeAreaView>
    </>
  );
};

export default App;
