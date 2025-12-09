import React from 'react';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', display: 'flex' }}>
            <Sidebar />
            <main style={{
                flex: 1,
                marginLeft: '256px',
                padding: '32px',
                transition: 'all 0.3s'
            }}>
                <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;
