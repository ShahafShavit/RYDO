import { Capacitor } from '@capacitor/core';

import { SplashScreen } from '@capacitor/splash-screen';

import React from 'react';

import ReactDOM from 'react-dom/client';

import { createHashRouter, RouterProvider } from 'react-router-dom';

import { createAppRoutes } from '@/app/router';

import AppProviders from '@/app/providers/AppProviders';

import '@/app/styles/index.css';



if (Capacitor.isNativePlatform()) {

  document.documentElement.classList.add('capacitor-native', `platform-${Capacitor.getPlatform()}`);

}



const router = createHashRouter(createAppRoutes({ nativeEntry: true }));



function NativeBootError({ error }) {

  return (

    <div

      style={{

        minHeight: '100dvh',

        display: 'flex',

        flexDirection: 'column',

        alignItems: 'center',

        justifyContent: 'center',

        gap: '1rem',

        padding: '1.5rem',

        background: '#0f0f10',

        color: '#fff',

        fontFamily: 'system-ui, sans-serif',

        textAlign: 'center',

      }}

    >

      <h1 style={{ fontSize: '1.125rem', fontWeight: 600 }}>RYDO could not start</h1>

      <p style={{ fontSize: '0.875rem', opacity: 0.75, maxWidth: '24rem' }}>

        {error?.message || 'An unexpected error occurred while loading the app.'}

      </p>

    </div>

  );

}



class NativeBootBoundary extends React.Component {

  constructor(props) {

    super(props);

    this.state = { error: null };

  }



  static getDerivedStateFromError(error) {

    return { error };

  }



  render() {

    if (this.state.error) {

      return <NativeBootError error={this.state.error} />;

    }

    return this.props.children;

  }

}



const root = ReactDOM.createRoot(document.getElementById('root'));



root.render(

  <React.StrictMode>

    <NativeBootBoundary>

      <AppProviders>

        <RouterProvider router={router} />

      </AppProviders>

    </NativeBootBoundary>

  </React.StrictMode>,

);



if (Capacitor.isNativePlatform()) {

  requestAnimationFrame(() => {

    SplashScreen.hide().catch(() => {});

  });

}


